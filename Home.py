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

from google.appengine.ext.webapp.util import run_wsgi_app

# Let's define the data model first
class Event(db.Model):
    who_user        = db.UserProperty()
    who_name        = db.StringProperty(multiline=False)
    what            = db.StringProperty(multiline=True)
    when_start      = db.DateTimeProperty(auto_now_add=False)
    when_end        = db.DateTimeProperty(auto_now_add=False)
    when_created    = db.DateTimeProperty(auto_now_add=True)
    where			= db.StringProperty(multiline=False)
    skill           = db.StringProperty(multiline=False)
    skill_neighbor  = db.StringProperty(multiline=False)
    where_loc       = db.GeoPtProperty()
    where_loc_lat   = db.FloatProperty()
    where_loc_lng   = db.FloatProperty()
    

class Home( webapp.RequestHandler ):
    def get( self ):
        template_values = {}
        path = os.path.join( os.path.dirname(__file__), 'index.html' )
        # path = os.path.join( os.path.dirname(__file__), 'coming_soon.htm' )
        self.response.out.write( template.render( path, template_values ))

class Browse( webapp.RequestHandler ):
    def get( self ):
        events = db.GqlQuery( "SELECT * "
                              "FROM Event" )
        
        template_values = {'events':events}
        path = os.path.join( os.path.dirname(__file__), 'browse_all.html' )
        self.response.out.write( template.render( path, template_values ))

def fixDate( str ):
    if str.lower() == "now":
        return datetime.now()
    else:
        return parser.parse( str )

class Add_event( webapp.RequestHandler ):
    def get( self ):
        template_values = {}
        path = os.path.join( os.path.dirname(__file__), 'add_event.html' )
        self.response.out.write( template.render( path, template_values ))
    def post( self ):
        event = Event()
        event.who_name      = self.request.get('who_name')
        event.what          = self.request.get('what')
        event.where         = self.request.get('where')
        event.when_start    = fixDate( self.request.get('when_start' ) )
        event.when_end      = fixDate( self.request.get('when_end' ) )
        event.skill         = self.request.get('skill' )
        event.skill_neighbor  = self.request.get('skill_neighbor' )
        
        logging.debug( "Outputting: " )
        logging.debug( self.request.get( 'loc_geopt_lng' ) )
        
        if self.request.get( 'loc_geopt_lat' ) and self.request.get( 'loc_geopt_lng' ):
            event.where_loc = db.GeoPt( self.request.get( 'loc_geopt_lat' ), self.request.get( 'loc_geopt_lng' ) )
            event.where_loc_lat   = self.request.get( 'loc_geopt_lat' )
            event.where_loc_lng   = self.request.get( 'loc_geopt_lng' )

        event.put()
        self.redirect( 'browse')
        # Add the information that was submitted
        
            
        


                            

def main():
    application = webapp.WSGIApplication(
                                     [('/', Home ),
                                      ('/browse', Browse ),
                                      ('/add', Add_event )
                                      ], debug=True )
    util.run_wsgi_app( application )

if __name__ == "__main__":
    main()