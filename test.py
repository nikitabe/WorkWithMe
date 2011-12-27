#from dateutil import parser
#date_object = parser.parse( '1pm' )

from libraries import geobox


print geobox.compute_tuple( 42.394497, -71.120768, -1, 5 )
   
print geobox.format_tuple( geobox.compute_tuple( 42.394497, -71.120768, -1, 5 ), -1 )