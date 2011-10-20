`#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import cgi 
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

class MainPage(webapp.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.out.write( """
            <html>
                <body>
                    <form action="/TestMe" method="Post">
                        <div><textarea name="content" rows="3" cols="60"></textarea></div>
                        <div><input type="submit" value="Leave a message"/></div>
                    </form>
                </body>
            </html>""" )

class TestMe( webapp.RequestHandler ):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.out.write( "what are you trying to say?" )
    def post(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.out.write( cgi.escape( self.request.get('content' )))

application = webapp.WSGIApplication(
                                     [('/', MainPage),
                                      ('/TestMe', TestMe )],
                                     debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()

"""        
    user = users.get_current_user()
    if user:
    self.response.headers['Content-Type'] = 'text/html'
    self.response.out.write("Hello, %s <br/><a href=\'%s\'>Log Out</a>" % (user.nickname(), users.create_logout_url("/")) )
    else:
    self.redirect(users.create_login_url(self.request.uri))
    """
