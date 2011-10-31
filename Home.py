import cgi
import os
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template
import logging
import json
import models
from google.appengine.ext import db
from datetime import datetime
from dateutil import parser

from google.appengine.ext.webapp.util import run_wsgi_app


class MyPage( webapp.RequestHandler ):

	def AddUserInfo(self, template_vars):
		user = models.get_current_user()
		greeting = ""
		if user:
			user_str = ""
			if user.username:
				user_str = " " + user.username
			greeting = "<ul><li><a href='%s'> Log Out</a></li></ul>" % (users.create_logout_url( self.request.uri ) )
		else:
			greeting = "<ul><li><a href='%s'>Log In</a></li></ul>" % users.create_login_url( self.request.uri )
		
		template_vars.update( {
			"username":user.username,
			"user":user,
			"greeting":greeting
		})
			
	
class Home( MyPage ):
    def get( self ):
		template_values = {}
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/index.htm' )
		# path = os.path.join( os.path.dirname(__file__), 'coming_soon.htm' )
		self.response.out.write( template.render( path, template_values ))

class Browse( MyPage ):
	def get( self ):
		events = db.GqlQuery( "SELECT * "
								"FROM Event" )

		template_values = {'events':events}
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
		template_values = {}
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/add_event.htm' )
		self.response.out.write( template.render( path, template_values ))
	def post( self ):
		event = models.Event()
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
		    event.where_loc = db.GeoPt( self.request.get( 'loc_geopt_lat' ), self.request.get( 'loc_geopt_lng' ) )
		    event.where_loc_lat   = float( self.request.get( 'loc_geopt_lat' ) )
		    event.where_loc_lng   = float( self.request.get( 'loc_geopt_lng' ) )

		event.init_geoboxes()
		event.put()
		
		self.response.out.write( self.request.get('Event Added') )
        
        # Add the information that was submitted	
        
class ComingSoon( webapp.RequestHandler ):
	def get( self ):
		 self.redirect( 'http://soon.workwithme.org')          

        
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
					'where_loc_lat': e_obj.where_loc_lat,  
					'where_loc_lng': e_obj.where_loc_lng,  
					'where_name': e_obj.where_name,	
					'where_addr': e_obj.where_addr,	
					'where_detail': e_obj.where_detail,   					
			}
			
			
			k = "%s|%s" % (e_obj.where_loc_lat, e_obj.where_loc_lng)
			
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
			
		output = json.dumps(locations);
			#output += "%s|" %e[1].key()

		self.response.out.write( output + " " )

class Profile( MyPage ):
	def get( self ):
		template_values = {}
		self.AddUserInfo( template_values )
		path = os.path.join( os.path.dirname(__file__), 'templates/profile.htm' )
		self.response.out.write( template.render( path, template_values ))
	def post( self ):
		user = models.get_current_user()
		user.username = self.request.get( "username" )
		user.put()
		self.response.out.write( "Update complete" )
		

def main():
	application = webapp.WSGIApplication( 
                                     [
									  ('/', Home ),
									  #('/', ComingSoon ),
                                      ('/browse', Browse ),
                                      ('/add', Add_event ),
									  ('/home', Home ),
									  ('/get_items', GetItems ),
									  ('/profile', Profile )
                                      ], debug=True )
	util.run_wsgi_app( application )

if __name__ == "__main__":
    main()