function hide_errors( func )
{
	$( "#who_name_error" ).slideUp( 'fast' );
	$( "#address_box_error" ).slideUp( 'fast');
	$( "#when_end_error" ).slideUp( 'fast', func );
	
}

function test(){
	$( "#what" ).val( "test what");
	$( "#where_quick_name" ).val( "test quickname" );
	$( "#where_name" ).val( "test name" );
	$( "#where_addr" ).val( "test addr" );
	$( "#where_detail" ).val( "test detail" );
	$( "#when_end" ).val( "6pm" );
	$( "#skill" ).val( "test skill" );
	$( "#skill_neighbor" ).val( "test" );
	$( "#loc_geopt_lat" ).val( "41.2345" );
	$( "#loc_geopt_lng" ).val( "71.2345" );
}

function do_submit(){
	hide_errors( function(){
		var has_error = false;
		// Perform validation
		if( $( "#who_name" ).val() == "" ){
			$( "#who_name_error" ).html( 'Please enter a name' ).slideDown( 'slow' );
			has_error = true; 
		}
		
		if( $( "#loc_geopt_lat" ).val() == "" || $( "#loc_geopt_lng" ).val() == "" ){
			$( "#address_box_error" ).html("Your location is not properly set.  Please set your location.").slideDown( 'slow');
			has_error = true;
		}

		if( $( "#when_end" ).val() == "" ){
			$( "#when_end_error" ).html("Please enter a time.").slideDown( 'slow');
			has_error = true;
		}
	
		if( has_error ) return false;
	
		d_s = Date.parse( $( "#when_start" ).val() );
		d_e = Date.parse( $( "#when_end" ).val() );
	
		w_e = "";
		try{
			w_e = d_e.toISOString();
			console.log( 'w_e:' + w_e );
		}
		catch( err ){
			$('#when_end_error').html("Please enter a time.  For example '5pm' or '1am'.").slideDown('slow');
			has_error = true;
		}
		if( has_error ) return false;
	
		$.ajax({
		  url: "/add",
		  type: "POST",
		  data: { 
			username: $( '#username' ).val(),
			who_name: $( "#who_name" ).val(),
			what: $( "#what" ).val(),
			where_quick_name: $( "#where_quick_name" ).val(),
			where_name: $( "#where_name" ).val(),
			where_addr: $( "#where_addr" ).val(),
			where_detail: $( "#where_detail" ).val(),
			when_start: d_s.toISOString(),
			when_end: 	w_e,
			skill: $( "#skill" ).val(),
			skill_neighbor: $( "#skill_neighbor" ).val(),
			loc_geopt_lat: $( "#loc_geopt_lat" ).val(),
			loc_geopt_lng: $( "#loc_geopt_lng" ).val(),
			},
		  success: function( msg ){
			if( msg == "OK"){
				if( $( '#username' ).val() ){
					window.location.href = "/user/" + $( '#username' ).val();
					return;
				}
			
	    		$("#add_step").slideUp( 'fast', function(){
	    			$("#not_logged_in_success_message").slideDown( 'slow' );
				});
			}
			else{
		    		$("#out_str").html( msg );
			}
		  }
		});
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