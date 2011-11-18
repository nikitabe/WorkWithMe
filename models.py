from google.appengine.ext import db
from dateutil import parser
from libraries import geobox
from google.appengine.api import users
from datetime import datetime
from datetime import tzinfo
from datetime import timedelta

import logging

# List of resolutions and slices. Should be in increasing order of size/scope.
GEOBOX_CONFIGS = (
  (4, 5, True),
  (3, 2, True),
  (3, 8, False),
  (3, 16, False),
  (2, 5, False),
  (1, 5, False),
)

ZERO = timedelta(0)

class UTC(tzinfo):
    """UTC"""

    def utcoffset(self, dt):
        return ZERO

    def tzname(self, dt):
        return "UTC"

    def dst(self, dt):
        return ZERO

tz = UTC()


class CUser( db.Model ):
	username = db.StringProperty()
	email 	 = db.EmailProperty()

	def user_id( self ):
		return self.key()
		
	def get_events( self, history ):
		q = Event.all().ancestor( self )
		if not history:
			logging.info( " ------- looking for events after: %s" % datetime.now( tz ))
			q.filter( "when_end >=", datetime.now( tz ) )
		else:
			logging.info( " ------- looking for events before: %s" % datetime.now( tz ))
			q.filter( "when_end <", datetime.now( tz ) )
		q.order( "-when_end" )
		return q.fetch(100)

def get_current_user():
	user = users.get_current_user()
	if user:
		return get_or_create_user( user )
	return None
	
def get_or_create_user( user ):
	u = CUser.get_by_key_name( user.user_id() )
	if u is None:
		u = CUser( key_name=user.user_id(), email=user.email())
	return u 

def get_user_by_user_id( user_id ):
	return Users.get_by_id( user_id )
	
def get_user_by_username( username ):
	return CUser.all().filter( "username = ", username ).get()

# Plan
# Store my custom places in the database as well
# Perhaps only store users in places rather than at their own geopoints

class GeoLoc( db.Model ):
	#pt				= db.GeoPtProperty()  # have problem with using filter( "pt = ", pt) <- wasn't finding items
	lat				= db.FloatProperty()
	lon				= db.FloatProperty()
	geoboxes		= db.StringListProperty()

	def init_geoboxes( self ):
		all_boxes = []
		for( resolution, slice, use_set) in GEOBOX_CONFIGS:
			if use_set:
				all_boxes.extend( geobox.compute_set( self.lat, self.lon, resolution, slice ) )
			else:
				# Check - why do we need to cast to float?
				all_boxes.append( geobox.compute( float( self.lat), float(self.lon), resolution, slice ) )

		self.geoboxes = all_boxes

	# Code modeled after: http://code.google.com/p/mutiny/source/browse/trunk/models.py
	@classmethod
	def query( cls, lat, lng, max_results, min_params, t = None ):
		found_events = {}
		for params in GEOBOX_CONFIGS:
			if( len(found_events) >= max_results ):
				break
			if( params < min_params ):
				break
		
			resolution, slice, unused = params
			box = geobox.compute( lat, lng, resolution, slice )
			#logging.info("Searching elements in box =%s at resolution=%s, slice=%s", box, resolution, slice)
			query = cls.all()
			query.filter( "geoboxes =", box )
			if t != None:
				# logging.info( "datetime: " + t.strftime("%A, %d. %B %Y %I:%M%p") )
				query.filter( "when_end >=", t )
			results = query.fetch( 50 );
			# logging.info("Found %d results", len(results))
			for result in results:
				if result.key() not in found_events:
					found_events[result.key()] = result	
		
		events_by_distance = []
		for event in found_events.itervalues():
			distance = geobox.earth_distance( lat, lng, event.lat, event.lon )
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
		
	@classmethod
	def queryArea( self, lat_lo, lng_lo, lat_hi, lng_hi, t = None ):
		return self.query( (lat_lo + lat_hi) / 2, (lng_lo + lng_hi) / 2, 10, (2,0), t)

	
class Place( GeoLoc ):
	place_name 		= db.StringProperty( multiline=False )
	
# Let's define the data model first
class Event( GeoLoc ):
	user        	= db.ReferenceProperty( CUser, collection_name="users")
	who_name        = db.StringProperty(multiline=False)
	what            = db.StringProperty(multiline=True)
	when_start      = db.DateTimeProperty(auto_now_add=False)
	when_end        = db.DateTimeProperty(auto_now_add=False)
	when_created    = db.DateTimeProperty(auto_now_add=True)
	skill           = db.StringProperty(multiline=False)
	skill_neighbor  = db.StringProperty(multiline=False)
	
	# This is now GeoLoc.pt - adjust all code accordingly
	# where_name		= db.StringProperty(multiline=False)
	where_addr		= db.StringProperty(multiline=True)
	where_detail 	= db.StringProperty(multiline=True)
	place			= db.ReferenceProperty( Place, collection_name="places")
	
		

def output_events():
	events = Event.all()
	for e in events:
		logging.info( "%s" % e.who_name )
		for box in e.geoboxes:
			logging.info( " - %s" % box )

def get_event( event_id ):
	return Event.get_by_id( event_id )
	
