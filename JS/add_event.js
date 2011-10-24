function init_add_event()
{
    $("#do_submit").click( do_submit );

}

function do_submit(){
	$.ajax({
	  url: "/add",
	  type: "POST",
	  data: { 
		who_name: $( "#who_name" ).val(),
		what: $( "#what" ).val(),
		where: $( "#where" ).val(),
		when_start: $( "#when_start" ).val(),
		when_end: $( "#when_end" ).val(),
		skill: $( "#skill" ).val(),
		skill_neighbor: $( "#skill_neighbor" ).val(),
		loc_geopt_lat: $( "#loc_geopt_lat" ).val(),
		loc_geopt_lng: $( "#loc_geopt_lng" ).val(),
		},
	  success: function( msg ){
	    $("#out_str").html("Value Updated!" );
	  }
	});
}


/*
// Nikita: This code is no longer being used.  It has been replaced by search_map.js

// Note that using Google Gears requires loading the Javascript
// at http://code.google.com/apis/gears/gears_init.js

var initialLocation;
// var siberia = new google.maps.LatLng(60, 105);
var newyork = new google.maps.LatLng(40.69847032728747, -73.9514422416687);
var browserSupportFlag =  new Boolean();

function findMyLocation() {
    var myOptions = {
        zoom: 6,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
    
    // Try W3C Geolocation (Preferred)
    if(navigator.geolocation) {
        $("#map_success").slideDown( "slow" ).html( "yay" );
        browserSupportFlag = true;
        navigator.geolocation.getCurrentPosition(function(position) {
                                                 initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
                                                 map.setCenter(initialLocation);
                                                 }, function( errorInfo) {
                                                 handleNoGeolocation1(browserSupportFlag, errorInfo);
                                                 });
        // Try Google Gears Geolocation
    } else if (google.gears) {
        browserSupportFlag = true;
        var geo = google.gears.factory.create('beta.geolocation');
        geo.getCurrentPosition(function(position) {
                               initialLocation = new google.maps.LatLng(position.latitude,position.longitude);
                               map.setCenter(initialLocation);
                               }, function() {
                               handleNoGeoLocation(browserSupportFlag);
                               });
        // Browser doesn't support Geolocation
    } else {
        browserSupportFlag = false;
        handleNoGeolocation(browserSupportFlag);
    }
    
    function handleNoGeolocation(errorFlag) {
        initialLocation = newyork;
        if (errorFlag == true) {
            alert(errorFlag.message);
        } else {
            alert("Your browser doesn't support geolocation.");
        }
        map.setCenter(initialLocation);
    }
    function handleNoGeolocation1(errorFlag, errorInfo) {
        initialLocation = newyork;
        if (errorFlag == true) {
            alert(errorInfo.message);
        } else {
            alert("Your browser doesn't support geolocation.");
        }
        map.setCenter(initialLocation);
    }
}    



$(document).ready(function()
{
    $( '#where' ).focusout( codeAddress );
    $( '#where' ).keypress( function( event ){
        if ( event.which == 13 ) {
            event.preventDefault();
            codeAddress();
        }
        });  
    initialize();
} );

var map;
var geocoder;
var infowindow;
var places_service;

function initialize() {
    infowindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();
    var latlng = new google.maps.LatLng(-34.397, 150.644);
    var myOptions = {
        zoom: 18,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
                                  myOptions);
    places_service = new google.maps.places.PlacesService( map );
    findMyLocation();
}

var markers_array = [];

function addMarker( place )
{
    var marker = new google.maps.Marker(
                                        {
                                        map: map,
                                        position: place.geometry.location
                                        });
    
    google.maps.event.addListener( marker, 'click', function(){
                                  infowindow.setContent( place.name );
                                  infowindow.open( map, this );
                                  } );

    $("#loc_geopt_lat").val( place.geometry.location.lat() );  
    $("#loc_geopt_lng").val( place.geometry.location.lng() );  

    markers_array.push( marker );
}

function clearMarkers()
{
    if( markers_array ){
        for( i in markers_array ){
            markers_array[i].setMap( null );
        }
        markers_array.length = 0;
    }
    $("#loc_geopt_lat").val( "" );  
    $("#loc_geopt_lng").val( "" );  
}

function codeAddress() {
    clearMarkers();
    var address = $("#where").val();
    var location;
    var place_to_add;
    
    geocoder.geocode( { 'address': address }, function(results, status) {
                     if (status == google.maps.GeocoderStatus.OK) {
                        map.setCenter(results[0].geometry.location);
                        location = results[0].geometry.location;
                     place_to_add = results[0];
                     }
                     else{
                        $("#map_success").slideUp( "slow" );
                        $("#map_error").html( "Geocode was not successful for the following reason: " + status).slideDown( "slow" );
                        
                        return;
                     }
                     } );

    places_service.search( { 'name': address, 'bounds': map.getBounds() }, function(results, status) {
                     if (status == google.maps.places.PlacesServiceStatus.OK ) {
                        map.setCenter(results[0].geometry.location);
                     
                        addMarker( results[0] );
                     
                        $("#map_error").slideUp( "slow" );
                        $("#map_success").html( "Place found." ).slideDown( "slow" );
                     

                     } else {
                          if( place_to_add ){
                          place_to_add.name = address;
                            addMarker( place_to_add );
                            $("#map_error").slideUp( "slow" );
                            $("#map_success").html( "Address found." ).slideDown( "slow" );
                          }
                          else{
                            $("#map_success").slideUp( "slow" );
                            $("#map_error").html( "Places search was not successful for the following reason: " + status).slideDown( "slow" );
                          }
                     }
                });
}        
*/