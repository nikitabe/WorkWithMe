import cgi
import os
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template
import logging
from django.utils import simplejson
import models
from google.appengine.ext import db
from datetime import datetime
from dateutil import parser

from google.appengine.ext.webapp.util import run_wsgi_app


class MyPage( webapp.RequestHandler ):
	def FirstInit(self):
		user = models.get_current_user()
		if user and user.username == None:
			self.redirect( "/profile")
		

	def AddUserInfo(self, template_vars):
		user = models.get_current_user()
		greeting = ""
		if user:
			user_str = ""
			if user.username:
				user_str = " " + user.username
			if user.username == None:
				user.username = ""
				user.put()
			greeting = "<li><a href='%s'> Log Out</a></li>" % (users.create_logout_url( self.request.uri ) )
			template_vars.update( {
				"username":user.username,
				"user":user
			})
		else:
			greeting = "<li><a href='%s'>Log In</a></li>" % users.create_login_url( self.request.uri )

		template_vars.update( {
			"greeting":greeting
		})
			
	
class Home( MyPage ):
    def get( self ):
		self.FirstInit()
		template_values = {}
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/index.htm' )
		# path = os.path.join( os.path.dirname(__file__), 'coming_soon.htm' )
		self.response.out.write( template.render( path, template_values ))


def PrepItemTemplate( items ):
	#ID is not automatically inserted
	for it in items:
		logging.info( "item %s" % it.key().id())
		it.id = it.key().id()
		if( it.parent() ):
			it.username = it.parent().username

	for it in items:
		logging.info( "item %s" % it.id)

class Browse( MyPage ):
	
	def get( self ):
		self.FirstInit()
		events = models.Event.all().filter( "when_end >=", datetime.now()).fetch( 50 )
		PrepItemTemplate( events )
		template_values = {'events':events, 'show_link':1}
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/browse_all.htm' )
		self.response.out.write( template.render( path, template_values ))

def fixDate( str ):
    if str.lower() == "now":
        return datetime.now()
    else:
        return parser.parse( str )

class Add_event( MyPage ):
	def get( self ):
		self.FirstInit()
		template_values = {}


		user = models.get_current_user()
		if user:
			old_event = models.Event.all().filter( "user =", user.key()).order( "when_end").get()
			if old_event:
				logging.info( "hello" )
				template_values.update( {
					"old_event":old_event
					})		
		
		
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/add_event.htm' )
		self.response.out.write( template.render( path, template_values ))
	def post( self ):
		n = self.request.get('who_name')
		logging.info( len( n ) )
		if len( n ) == 0:
			self.response.out.write( 'Please enter your name' )
			return
					
		user = models.get_current_user()

		event = models.Event( parent = user )
		
		if user:
			event.user = user
			old_event = models.Event.all().ancestor( user ).filter( "when_end >=", datetime.now() ).get()
			if old_event:
				old_event.when_end = datetime.now()
				old_event.put()
		
		event.who_name      = self.request.get('who_name')
		event.what          = self.request.get('what')
		event.when_start    = fixDate( self.request.get('when_start' ) )
		event.when_end      = fixDate( self.request.get('when_end' ) )
		event.skill         = self.request.get('skill' )
		event.skill_neighbor  = self.request.get('skill_neighbor' )

		event.where_name    = self.request.get('where_name')
		event.where_addr    = self.request.get('where_addr')
		event.where_detail  = self.request.get('where_detail')

		if self.request.get( 'loc_geopt_lat' ) and self.request.get( 'loc_geopt_lng' ):
		    event.pt = db.GeoPt( self.request.get( 'loc_geopt_lat' ), self.request.get( 'loc_geopt_lng' ) )

		event.init_geoboxes()
		event.put()
		
		self.response.out.write( 'OK' )
        
        # Add the information that was submitted	
        

        
class GetItems( webapp.RequestHandler ):
	def get( self ):
		# this is called with toUrlValue for map bounds: http://code.google.com/apis/maps/documentation/javascript/reference.html#LatLngBounds		
		bounds = self.request.get('bounds').split( "," )		
		lat_lo = float( bounds[0] )	
		lng_lo = float( bounds[1] )
		lat_hi = float( bounds[2] )
		lng_hi = float( bounds[3] )
		
		events = models.Event.queryArea( lat_lo, lng_lo, lat_hi, lng_hi, datetime.now() )
		
		# This is inefficient
		locations = {}
		for e in events:
			e_obj = e[1]
			out_obj = {
					'who_name': e_obj.who_name,      
					'what': e_obj.what,           
					#'when_start': e_obj.when_start,     
					#'when_end': e_obj.when_end,       
					# 'when_created': e_obj.when_created,
					'skill': e_obj.skill,          
					'skill_neighbor': e_obj.skill_neighbor, 
					# 'where_loc': e_obj.where_loc,      
					'where_loc_lat': e_obj.pt.lat,  
					'where_loc_lng': e_obj.pt.lon,  
					'where_name': e_obj.where_name,	
					'where_addr': e_obj.where_addr,	
					'where_detail': e_obj.where_detail,   					
			}
			
			
			k = "%s|%s" % (e_obj.pt.lat, e_obj.pt.lon)
			
			right_list = locations.get( k )
			if right_list:
				right_list.append( out_obj )
			else:
				new_list = [out_obj]
				locations.update( {k:new_list} ) 
					
		#output_objects = []
		#for e in events:
		#	e_obj = e[1]
		#	output_objects.append( out_obj )
			
		output = simplejson.dumps(locations);
			#output += "%s|" %e[1].key()

		self.response.out.write( output + " " )

# To do: require login
class Profile( MyPage ):
	def get( self ):
		# Get the last event and set default values for it here
		template_values = {}
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/profile.htm' )
		self.response.out.write( template.render( path, template_values ))
	def post( self ):
		user = models.get_current_user()
		un = self.request.get( "username" )
		
		existing_user = models.get_user_by_username( un )
		if existing_user and  (existing_user.user_id() != user.user_id()):
			self.response.out.write( 'A user with this username already exists' )
			return

		user.username = un
		user.put()
		self.response.out.write( "Update complete" )



class EventHandler( MyPage ):
	def get( self, event_id ):
		self.FirstInit()
		# implement getting the item according to an id
		logging.info( "input: %s" % event_id)
		event = models.get_event( long( event_id ) )
		PrepItemTemplate( [event] )
		logging.info( "event id: %s, %s" % (event.id, event.who_name ) )
		template_values = {'show_link':0, 'event':event }
	
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/event.htm' )
		self.response.out.write( template.render( path, template_values ))
		

class UserHandler( MyPage ):
	def get( self, username ):
		self.FirstInit()
		logging.info( "username: " + username)
		user_to_view = models.get_user_by_username( username )
		events = user_to_view.get_events( False )
		old_events = user_to_view.get_events( True )
		
		user_is_me = False

		user = models.get_current_user()
		if user and user_to_view.user_id() == user.user_id():
			user_is_me = True
			
		template_values = { 'user_to_view':user_to_view, 'events':events, 'old_events':old_events, 'user_is_me':user_is_me } 
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname( __file__ ), 'templates/user.htm')
		self.response.out.write( template.render( path, template_values ))	
	def post( self, username, action ):
		if action == "closeout":
			user = models.get_current_user()
			target_user = models.get_user_by_username( username )
			if user.user_id() != target_user.user_id():
				self.response.out.write( "You ain't got no right!")
				return False
			
			if user:
				events = models.Event.all().ancestor( target_user ).filter( "when_end >=", datetime.now() ).fetch(50)
				for event in events:
					event.when_end = datetime.now()
					event.put()
		self.redirect( "/user/" + username )

class LocationHandler( MyPage ):
	def get( self, lng, lat, place_name ):
		template_values = {} 
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname( __file__ ), 'templates/location.htm')
		self.response.out.write( template.render( path, template_values ))	
					
		
class ComingSoon( webapp.RequestHandler ):
	def get( self ):
		 self.redirect( 'http://soon.workwithme.org')          

def main():
	application = webapp.WSGIApplication( 
                                     [
									  ('/', Home ),
									  #('/', ComingSoon ),
									  ('/event/(.*)', EventHandler),
                                      ('/browse', Browse ),
                                      ('/add', Add_event ),
									  ('/home', Home ),
									  ('/get_items', GetItems ),
									  ('/profile', Profile ),
									  ('/place/(.*)/(.*)', LocationHandler ),
									  ('/place/(.*)/(.*)/(.*)', LocationHandler ),
									  ('/user/(.*)/(.*)', UserHandler),
									  ('/user/(.*)', UserHandler)
                                      ], debug=True )
	util.run_wsgi_app( application )

if __name__ == "__main__":
    main()