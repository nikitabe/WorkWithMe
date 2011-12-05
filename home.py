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
from datetime import timedelta
from dateutil import parser
from datetime import tzinfo

from models import tz 
from google.appengine.ext.webapp.util import run_wsgi_app


from google.appengine.api import mail


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
		template_values = {}
		
		user = models.get_current_user()
		if( user ):
			my_events = user.get_events( False )
			template_values.update( { "my_events" : my_events })
		
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/browse_all.htm' )
		self.response.out.write( template.render( path, template_values ))

def fixDate( str ):
    if str.lower() == "now":
        return datetime.now( tz )
    else:
		logging.info( str )
		return parser.parse( str )

class Add_event( MyPage ):
	def get( self ):
		self.FirstInit()
		template_values = {}


		user = models.get_current_user()
		if user:
			if not user.username:
				self.redirect( '/profile')          
			 	return
			old_event = models.Event.all().filter( "user =", user.key()).order( "-when_end").get()
			if old_event:				
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
			old_event = models.Event.all().ancestor( user ).filter( "when_end >=", datetime.now( tz ) ).get()
			if old_event:
				old_event.when_end = datetime.now( tz )
				old_event.put()
		
		logging.info( "incoming date_start: " + self.request.get('when_start' ) )
		date_start = fixDate( self.request.get('when_start' ) )
		date_end = fixDate( self.request.get('when_end' ) )
		
		if date_end < date_start:
			date_end = date_end + timedelta(days=1)
		
		event.who_name      = self.request.get('who_name')
		event.what          = self.request.get('what')
		event.when_start    = date_start
		event.when_end      = date_end
		event.skill         = self.request.get('skill' )
		event.skill_neighbor  = self.request.get('skill_neighbor' )

		lat = 0
		lon = 0
		if self.request.get( 'loc_geopt_lat' ) and self.request.get( 'loc_geopt_lng' ):
			lat = round( float( self.request.get( 'loc_geopt_lat' ) ), 6)
			lon = round( float( self.request.get( 'loc_geopt_lng' ) ), 6)
			event.lat = lat
			event.lon = lon	

		place = models.get_place( lat, lon, self.request.get('where_name'))
		
		event.place    		= place
		event.place_name	= self.request.get('where_name')
		event.where_addr    = self.request.get('where_addr')
		event.where_detail  = self.request.get('where_detail')


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
		
		logging.info( "Searching for: lat_lo %s, lat_hi %s, lng_lo %s, lng_hi %s " % (lat_lo, lat_hi, lng_lo, lng_hi) )
		
		events = models.Event.queryArea( lat_lo, lng_lo, lat_hi, lng_hi, datetime.now( tz ) )
		
		logging.info( "Search returned %s results" % len( events) )

		
		# This is inefficient
		locations = {}
		for e in events:
			e_obj = e[1]

			template_values = {'event':e_obj}
			path = os.path.join( os.path.dirname(__file__), 'templates/event_snip.htm' )
			event_html = template.render( path, template_values )

			out_obj = {
					'event_id': e_obj.key().id(),
					'who_name': e_obj.who_name,      
					'what': e_obj.what,           
					#'when_start': e_obj.when_start,     
					#'when_end': e_obj.when_end,       
					# 'when_created': e_obj.when_created,
					'skill': e_obj.skill,          
					'skill_neighbor': e_obj.skill_neighbor, 
					'where_loc_lat': e_obj.lat,  
					'where_loc_lng': e_obj.lon,  
					'place_name': e_obj.place.place_name,	
					'where_addr': e_obj.where_addr,	
					'where_detail': e_obj.where_detail,
					'event_html': event_html					
			}
			
			
			k = "%s|%s" % (e_obj.lat, e_obj.lon)
			
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
		
		output = simplejson.dumps( [user.username, "UpdateComplete"] );
		
		self.response.out.write( output )



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
		events = []
		old_events = []	
		user_to_view = None
		user_is_me = False

		
		self.FirstInit()
		logging.info( "username: " + username)
		user_to_view = models.get_user_by_username( username )
		if user_to_view:
			events = user_to_view.get_events( False )
		
			user = models.get_current_user()
			if user and user_to_view.user_id() == user.user_id():
				user_is_me = True
				old_events = user_to_view.get_events( True )  # Security - don't let people see each other's histories

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
				events = models.Event.all().ancestor( target_user ).filter( "when_end >=", datetime.now( tz ) ).fetch(50)
				for event in events:
					event.when_end = datetime.now( tz )
					event.put()
		self.redirect( "/user/" + username )

class LocationHandler( MyPage ):
	def get( self, lat, lon, place_name ):
		events = []
		
		place = models.Place.all().filter( "lat =", float(lat) ).filter( "lon =", float(lon)).get()
		if place:
			logging.info( "LocationHandler: found a place: " + place.place_name)
			# Get all events from this location
			q = models.Event.all()
			events = q.filter( "place =", place ).filter( "when_end >=", datetime.now( tz ) ).fetch(100)
		
		template_values = { "events": events, "place":place } 
		logging.info( "LocationHandler: Found so many: %s" % len( events ) )
			
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname( __file__ ), 'templates/place.htm')
		self.response.out.write( template.render( path, template_values ))	

class ConversationHandler( MyPage ):
	def get( self, username ):
		user_to_view = None
		user_is_me = False
		
		user_to_view = models.get_user_by_username( username )
		if user_to_view:
			events = user_to_view.get_events( False )
			old_events = user_to_view.get_events( True )
		
			user = models.get_current_user()
			if user and user_to_view.user_id() == user.user_id():
				user_is_me = True

		template_values = { 'user_to_view':user_to_view, 'user_is_me':user_is_me } 
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname( __file__ ), 'templates/conversation.htm')
		self.response.out.write( template.render( path, template_values ))	
	def post( self ):
		send_to_username = self.request.get('username')
		target_user = models.get_user_by_username( send_to_username )
		
		# how to send an email?
		user = models.get_current_user()
		if( user ):
			message = mail.EmailMessage(sender=user.email,
			                            subject="Message via WorkWithMe from " + user.username )

			message.to = target_user.email #"Albert Johnson <Albert.Johnson@example.com>"
			message.body = self.request.get( 'message' )

			m = models.CMessage( parent=user, user_to = target_user, content = message.body )
			m.put()

			message.send()
			
			logging.info( "sender: " + message.sender )
			logging.info( "subject: " + message.subject )
			logging.info( "to: " + message.to )
			logging.info( "body: " + message.body )
			
			
			self.response.out.write( "OK" )	
		else:
			self.response.out.write( "User Not Logged In" )
		

class TestHandler( MyPage ):
	def get( self, username ):
		template_values = {} 
		path = os.path.join( os.path.dirname( __file__ ), 'templates/test.htm')
		self.response.out.write( template.render( path, template_values ))	

		
class ComingSoon( webapp.RequestHandler ):
	def get( self ):
		 self.redirect( 'http://soon.workwithme.org')          

def main():
	application = webapp.WSGIApplication( 
                                     [
									  
									  ('/', ComingSoon ),
									  #('/', Browse ),
									  ('/event/(.*)', EventHandler),
                                      ('/browse', Browse ),
                                      ('/add', Add_event ),
									  ('/home', Home ),
									  ('/get_items', GetItems ),
									  ('/profile', Profile ),
									  ('/place/(.*)/(.*)/(.*)', LocationHandler ),
									  ('/place/(.*)/(.*)', LocationHandler ),
									  ('/user/(.*)/(.*)', UserHandler),
									  ('/user/(.*)', UserHandler),
									  ('/test', TestHandler ),
									  ('/conversation/(.*)', ConversationHandler),
									  ('/conversation', ConversationHandler)
                                      ], debug=True )
	util.run_wsgi_app( application )

if __name__ == "__main__":
    main()