import cgi
import os
from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template
from dateutil import parser
from datetime import datetime
import logging
from django.utils import simplejson
from libraries import geobox
import json

from google.appengine.ext.webapp.util import run_wsgi_app

# List of resolutions and slices. Should be in increasing order of size/scope.
GEOBOX_CONFIGS = (
  (4, 5, True),
  (3, 2, True),
  (3, 8, False),
  (3, 16, False),
  (2, 5, False),
  (1, 5, False),
)



# Let's define the data model first
class Event(db.Model):
	who_user        = db.UserProperty()
	who_name        = db.StringProperty(multiline=False)
	what            = db.StringProperty(multiline=True)
	when_start      = db.DateTimeProperty(auto_now_add=False)
	when_end        = db.DateTimeProperty(auto_now_add=False)
	when_created    = db.DateTimeProperty(auto_now_add=True)
	skill           = db.StringProperty(multiline=False)
	skill_neighbor  = db.StringProperty(multiline=False)
	where_loc       = db.GeoPtProperty()
	where_loc_lat   = db.FloatProperty()
	where_loc_lng   = db.FloatProperty()
	where_name		= db.StringProperty(multiline=False)
	where_addr		= db.StringProperty(multiline=True)
	where_detail 	= db.StringProperty(multiline=True)
	geoboxes		= db.StringListProperty() # For location calculation
	
	def init_geoboxes( self ):
		all_boxes = []
		for( resolution, slice, use_set) in GEOBOX_CONFIGS:
			if use_set:
				all_boxes.extend( geobox.compute_set( self.where_loc_lat, self.where_loc_lng, resolution, slice ) )
			else:
				all_boxes.append( geobox.compute( float( self.where_loc_lat), float(self.where_loc_lng), resolution, slice ) )

		self.geoboxes = all_boxes

	# Code modeled after: http://code.google.com/p/mutiny/source/browse/trunk/models.py
	@classmethod
	def query( cls, lat, lng, max_results, min_params ):
		found_events = {}
		for params in GEOBOX_CONFIGS:
			if( len(found_events) >= max_results ):
				break
			if( params < min_params ):
				break
		
			resolution, slice, unused = params
			box = geobox.compute( lat, lng, resolution, slice )
			logging.info("Searching elements in box =%s at resolution=%s, slice=%s",
			                    box, resolution, slice)
			query = cls.all()
			query.filter( "geoboxes =", box )
			results = query.fetch( 50 );
			logging.info("Found %d results", len(results))
			for result in results:
				if result.key() not in found_events:
					found_events[result.key()] = result	
		
		events_by_distance = []
		for event in found_events.itervalues():
			distance = geobox.earth_distance( lat, lng, event.where_loc_lat, event.where_loc_lng )
			events_by_distance.append((distance, event))
		
		events_by_distance.sort()
		
		return events_by_distance
	
	@classmethod
	def run_test( self ):
		query = Event.all()
		#query.filter("geoboxes =", box)
		query.filter( "geoboxes = ", "42.40|-71.15|42.35|-71.10")
		results = query.fetch( 50)
		return len( results)
		

class Home( webapp.RequestHandler ):
    def get( self ):
        template_values = {}
        path = os.path.join( os.path.dirname(__file__), 'templates/index.htm' )
        # path = os.path.join( os.path.dirname(__file__), 'coming_soon.htm' )
        self.response.out.write( template.render( path, template_values ))

class Browse( webapp.RequestHandler ):
    def get( self ):
        events = db.GqlQuery( "SELECT * "
                              "FROM Event" )
        
        template_values = {'events':events}
        path = os.path.join( os.path.dirname(__file__), 'templates/browse_all.htm' )
        self.response.out.write( template.render( path, template_values ))

def fixDate( str ):
    if str.lower() == "now":
        return datetime.now()
    else:
        return parser.parse( str )

class Add_event( webapp.RequestHandler ):
    def get( self ):
        template_values = {}
        path = os.path.join( os.path.dirname(__file__), 'templates/add_event.htm' )
        self.response.out.write( template.render( path, template_values ))
    def post( self ):
		event = Event()
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

def output_events():
	events = Event.all()
	for e in events:
		logging.info( "%s" % e.who_name )
		for box in e.geoboxes:
			logging.info( " - %s" % box )
	
        
class ComingSoon( webapp.RequestHandler ):
	def get( self ):
		 self.redirect( 'http://soon.workwithme.org')          

        
class GetItems( webapp.RequestHandler ):
	def get( self ):
		logging.info( "------------ Events ---------- ")
		output_events()
		logging.info( "In GetItems")
		# this is called with toUrlValue for map bounds: http://code.google.com/apis/maps/documentation/javascript/reference.html#LatLngBounds		
		bounds = self.request.get('bounds').split( "," )		
		lat_lo = float( bounds[0] )	
		lng_lo = float( bounds[1] )
		lat_hi = float( bounds[2] )
		lng_hi = float( bounds[3] )
		
		events = Event.query( (lat_lo + lat_hi) / 2, (lng_lo + lng_hi) / 2, 10, (2,0))
		
		output_objects = []
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
			output_objects.append( out_obj )
			
		output = json.dumps(output_objects);
			#output += "%s|" %e[1].key()

		self.response.out.write( output )
                            

def main():
	application = webapp.WSGIApplication( 
                                     [
									  ('/', Home ),
									  #('/', ComingSoon ),
                                      ('/browse', Browse ),
                                      ('/add', Add_event ),
									  ('/home', Home ),
									  ('/get_items', GetItems )
                                      ], debug=True )
	util.run_wsgi_app( application )

if __name__ == "__main__":
    main()