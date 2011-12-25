var map,
	default_zoom = 15,
	already_working = false,
	my_loc_marker = 0,
	my_loc_circle = null,
	info_window = 0,
	listener_handle = 0,
    defaultTypes = 'store gym cafe food bar office street_address point_of_interest floor intersection natural_feature point_of_interest post_box premise room street_address street_number subpremise transit_station'.split(" "),
	places_list = [],
	lookup_place = [];

var CLEAR_ALL = 0x0,
	CLEAR_ME = 0x1,
	CLEAR_WITH_USERS = 0x2,
	CLEAR_WITHOUT_USERS = 0x4,
	CLEAR_LEAVE_ME = CLEAR_WITH_USERS | CLEAR_WITHOUT_USERS;
	
function map_init_resources( div_id )
{
    var pi0 = new google.maps.LatLng(0, 0);
    
    map = new google.maps.Map( document.getElementById( div_id ), {
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            center: pi0,
            zoom: default_zoom,
			scrollwheel: false
        });

	geocoder = new google.maps.Geocoder();

	info_window = new google.maps.InfoWindow();

}

function clear_my_loc()
{
	if( my_loc_marker ){
		my_loc_marker.marker.setMap( null );
		my_loc_marker = 0;
		my_loc_circle = null;
	}
}

function find_address_by_loc( loc, func )
{
	if( already_working) return;
	already_working = true;
    geocoder.geocode( { 'latLng': loc }, function(results, stat) {
		already_working = false;
    	if (stat == google.maps.GeocoderStatus.OK) {
			if( results [0] )
				func( results[0].formatted_address );
		}
    });	
}

function map_center_on_me( complete_func )
{
	if( already_working ) return;

	console.log( "centering on me");
	setStatus( "working", 'Looking for you...', "map_center_on_me", function(){
		clear_my_loc();
	    if (navigator &&
	            (ng = navigator.geolocation) &&
	            ng.getCurrentPosition) {
		   already_working = true;
	       ng.getCurrentPosition( function( pos ){ 
									already_working = false;
									setStatus( "success", "Found your coordinates." );
									var myLoc = new google.maps.LatLng( 
																	pos.coords.latitude, 
																	pos.coords.longitude );
																	
									
									find_address_by_loc( myLoc, function( addr ){
										add_marker_me( myLoc, addr, "", complete_func );
									} );									
									
								   }, 
								function( error ){
									already_working = false;
									center_on_me_not_found( error );
								});
		} else {
			setStatus( "error", "<h3>Your browser does not support geolocation.  <button class='btn' name='findMeBtn'' id='findMeBtn' value='Find Me'>Try Again!</button></h3>", "map_center_on_me" );
	    }
	});
}

function add_marker( loc, icon, msg, z_index )
{
	var marker = new google.maps.Marker({
		map: map,
		position: loc,
		animation: google.maps.Animation.DROP,
		icon: '/images/markers/' + icon,
		zIndex: z_index
    });

    google.maps.event.addListener(marker, 'click',
            function() {
                info_window.setContent( msg );
                info_window.open( map, marker );
            });

	return marker;
}

function DrawCircle( loc, rad )
{
    if (my_loc_circle != null) {
        my_loc_circle.setMap(null);
    }
    my_loc_circle = new google.maps.Circle({
        center: loc,
        radius: rad,
        strokeColor: "#FF0000",
        strokeOpacity: 0.4,
        strokeWeight: 0.5,
        fillColor: "#FF0000",
        fillOpacity: 0.15	,
        map: map
    });
}

function add_marker_me( loc, address, msg, compelte_func )
{
	DrawCircle( loc, 100 );
	add_place_marker( loc, "", address, "", msg, 0, true );

    map.panTo( loc );
    map.setZoom( default_zoom );

	// Need to call listener because that is when the bounds actually change
	listener_handle = google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
	 	if( typeof( complete_func ) != 'undefined' ){
			console.log( 'add_marker_me: running complete_func');
			complete_func();
			listener_handle = 0;
			//google.maps.event.removeListener(listener_handle);
		}			
	});	
}

function add_place_marker( loc, name, address, type, comment,  num_users, i_am_here )
{
	var place_id = get_place_id( loc, name );
	if( lookup_place[place_id] ){
		var old = lookup_place[place_id];
		if( old.num_users != num_users ){
			old.marker.setMap( null );
			lookup_place[place_id] = 0;
		}
		else return;
	}
	
	var person_str = num_users ? 
						( ( num_users == 1 )  ? "person" : "people" ) 
						: "";
	
	var info_str = "";
	
	if( i_am_here ){
		info_str = "<div>I am here!</div>";
	}
		
	info_str +=
		"<div class='map_info_who'>" + num_users + " " + person_str + " hanging out at </div>" +
		"<div class='map_info_place_name'><a href='/place/" + loc.lat() + "/" + loc.lng() + "/" + name + "'>" + name + "</a></div>" + 
		"<div class='map_info_address'>" + address + "</div>";		

	info_str += pickMeStr(loc, name, address );		

	console.log( "add_place_marker: " + loc + " num: " + num_users );
	
	if( num_users > 0 ){
		marker_color = "darkgreen";
		if( i_am_here ) marker_color = "red"; 
		if( num_users > 9 ) num_users = "X";
		marker_icon = marker_color + "_Marker" + num_users + ".png";
	}
	else{
		if( i_am_here ) marker_icon = "marker_me.png";
		else marker_icon = "blue_MarkerP.png";		
	}
	
	var place_id = get_place_id( loc, name );
	
	if( lookup_place[place_id] ){
		marker = lookup_place[place_id];
	}
	else{
		var z_index = 10;
		if( i_am_here ) z_index = 5;
		
		marker = add_marker( loc, marker_icon, info_str, z_index );

		var place_obj = new Object;
		place_obj.marker = marker;
		place_obj.num_users = num_users;
		place_obj.id = place_id;
		
		if( !i_am_here ){
			places_list.push( place_obj );
			lookup_place[place_id] = place_obj;
		}
	}


	return marker;
}

function center_on_me_not_found( error )
{
    setStatus( "error", "Can't find you :( <button class='btn' name='findMeBtn'' id='findMeBtn' value='Find Me' onclick='map_center_on_me()'>Try Again!</button>");
}

function clear_place_markers( type )
{	
	console.log( "Clearing: " + type );
	if( type & CLEAR_ALL || type & CLEAR_ME ) clear_my_loc();
	
	
    for(var i=places_list.length - 1;i>=0;i--) {
		if( type & CLEAR_ALL || 
				(type & CLEAR_WITH_USERS && places_list[i].num_users > 0 ) || 
				(type & CLEAR_WITHOUT_USERS && places_list[i].num_users == 0 ) ){ 
			m = places_list[i].marker;
	        m.setMap(null);
			lookup_place[places_list[i].id] = 0;
			places_list.splice( i, 1 );
		}
    }
	old_list = places_list;
}

function map_find_places( sTxt, func_success, func_none_found ){
	if( already_working ) return;
	already_working = true;

	var map_bounds = map.getBounds();
    var placeApi = new google.maps.places.PlacesService(map);
    var searchRequest = {
        name: sTxt,
        types: defaultTypes,
		bounds: map_bounds
		};
    placeApi.search(searchRequest, function( r, s ){
			already_working = false;
			if( google.maps.places.PlacesServiceStatus.OK && r.length > 0 ){
				// We found places!  Let's pass them for processing.
				func_success( r, s, false );
			} 
			else{
				already_working = true;
				// Second iteration attempt
			    var searchRequest = {
			        name: sTxt,
					location: map.getCenter(),
					radius: 50000
					};
			    placeApi.search(searchRequest, function( r, s ){			    
					already_working = false;
					if( google.maps.places.PlacesServiceStatus.OK && r.length > 0 ){
						// We found places!  Let's pass them for processing.
						func_success( r, s, true );
					} 
					else{
						// We didn't find anything.  Let's look elsewhere
						func_none_found();
					}
				} );
			}
		});
}

function map_find_via_address( sTxt, func_success, func_none_found ){
	if( already_working ) return;
	already_working = true;
    geocoder.geocode( { 'address': sTxt }, function(r, s ) {
		already_working = false;
    	if (s == google.maps.GeocoderStatus.OK && r.length > 0 ) {
			func_success( r, s );
		}
		else{
			func_none_found();
		}
    });
}

function setMyPositionTo( lat, lon, name, addr )
{
	window.location = "/add?lat="+lat+"&lon="+lon+"&name="+name+"&addr="+addr;
}

function pickMeStr( loc, name, addr )
{
	return " <button class='btn' onclick=\"setMyPositionTo(" + loc.lat() + "," + loc.lng() + ", '" + escape(name) + "', '" + escape(addr) + "')\">I am here</button>";
}

function displayPlaceByID( place_id )
{
	if( lookup_place[place_id] ){
		marker = lookup_place[place_id].marker;
		map.panTo( marker.getPosition() );
		google.maps.event.trigger( marker, 'click'); 
	}
}

function get_place_id( loc, name )
{
	//return "" + loc.lat() + "|" + loc.lng() + "|" + name;
	return "" + loc.lat() + "|" + loc.lng();
}
