
$(function () {
	map_init_resources( 'map_canvas');
	map_center_on_me();

	$("#nav_browse").addClass( "active" );
	
	// 
    $("#searchBtn").click( function () {
        search_for_stuff();
    });
	
	$("#where").keydown( function(event){
		if (event.keyCode == '13') {
			search_for_stuff();
		}
	});
		
	// Need to call listener because that is when the bounds actually change
	// Not using bounds_changed because http://stackoverflow.com/questions/4338490/google-map-event-bounds-changed-triggered-multiple-times-when-dragging
	google.maps.event.addListener(map, 'dragend', onDragAround );
	google.maps.event.addListener(map, 'zoom_changed', function(){
														if( !already_working){
															already_working = true;
															setTimeout("onDragAround()", 500);
														}
													} );

});

function onDragAround()
{
	find_users_on_map();
	if( $("#where").val().length > 0 )
		perform_search();
}

function search_for_stuff()
{
	clear_place_markers( CLEAR_WITHOUT_USERS );
	if( $("#where").val().length > 0 )
		perform_search();
}

function perform_search()
{
	$( "#search_results" ).slideUp('fast', function(){
		$( "#search_results" ).html( "" );					
		map_find_places( $("#where").val(), process_places_result, find_via_address );	
	});
	var bounds = map.getBounds()
	for( i in places_list ){
		var m = places_list[i];
		if( bounds.contains(m.marker.getPosition()) == false ){
			m.marker.setMap( null );
			lookup_place[m.id] = 0;
			places_list.splice( i, 1 );
		}
	}
	
}

function find_via_address()
{
	map_find_via_address( $("#where").val(), process_address_result, found_nothing )
}

function process_places_result( result_list, s, expand_bounds )
{
	var bounds = map.getBounds();
	// Cycle through all results and add them to the map as appropriate
    for (var i = 0; i < result_list.length; i++) {
		var p = result_list[i];
		// Get the data
		var loc = p.geometry.location,
		 	name = p.name,
			type = p.types[0],
			address = p.vicinity;
		
		bounds.extend( loc );
			
		var place_id = get_place_id( loc, name ); 
		// console.log( "Found place: " + name + " at " + place_id + " lat: " + loc.lat() + " lon: " + loc.lng() );
		
		if( lookup_place[place_id] ){
			if( result_list.length == 1 )
				displayPlaceByID( place_id );
		}
		else{			
			add_place_marker( loc, name, address, type, "", 0, false );
		}

		// This is probably wrong.  Selector should be UL under #searchResults
		$( "#search_results" ).append( "<tr><td>" + 
		"<div class='map_info_place_name'><a onclick=\"displayPlaceByID('" + place_id + "')\">" + name + "</a></div>" + 
				"<div class='map_info_address'>" + address + "</div>" + 
		"</td></tr>" );
	}
	if( expand_bounds )
		map.fitBounds( bounds );

	$( "#search_results" ).slideDown('slow');
	
}

function process_address_result( result_list, s )
{
	
    var dBounds = new google.maps.LatLngBounds();
	for( j in result_list ){
		var r = result_list[j];
		var address = r.formatted_address; 
		var loc = r.geometry.location;
		
		// This is probably wrong.  Selector should be UL under #searchResults
		$( "#search_results" ).append( "<tr><td>" + address + "</td></tr>" );

		var place_id = get_place_id( loc, name ); 
		// console.log( "Found address: %s at %s: " % (name, place_id) );

		if( lookup_place[place_id] ){
			displayPlaceByID( place_id );
		}
		else{			
			add_place_marker( loc, "", address, "", "", 0, false );
		}

	}

	$( "#search_results" ).slideDown('slow');
	map.panTo( result_list[0].geometry.location );
	find_users_on_map();

	// map.fitBounds(dBounds);

	if( map.getZoom() > default_zoom )
		map.setZoom( default_zoom );

	// $("#searchResults").slideDown( 'slow');
}

function found_nothing()
{
	setStatus( "error", "Didn't find anything :(", "found_nothing()");
}

function add_event( id, event_html )
{
	$( "#events_table" ).append( "<tr class='hidden' id='" + id + "'><td>" + event_html + "</td></tr>");
	$( "#" + id ).slideDown( 'slow' );
}


function find_users_on_map()
{
	already_working = false;
	console.log( "aw = " + already_working );
	
	//clear_place_markers( CLEAR_WITH_USERS );
	
	
	$( "#events_table tr" ).slideUp( 'slow' );
	$( "#events_table" ).html( "" );
	
	console.log( "find_users_on_map: looking for items around");
	setStatus( "working", "Working...", "findItems", function(){
	
	var show_history = "";
	if( $("#show_history").val() ){
		show_history = "&show_history=1";
	}
	var bounds = map.getBounds();
	
	already_working = true;
	// Make the AJAX call to get the items within bounds
	$.ajax( {
				url: "/get_items?bounds=" + bounds.toUrlValue(10) + show_history + '&json=1', 
				dataType: 'json',
				error: function(jqXHR, textStatus, errorThrown){
						already_working = false;
						console.log( "setting to false");

						setStatus( "error", "There was an error: " + jqXHR + ", " + textStatus + ", "+ errorThrown, "findItems" );
					},
				success: function( items_json ){
					//$("#received").html( "he: " + items_json );
					// clear_place_markers( CLEAR_WITH_USERS );
					var locations = eval( items_json );
					
					for( var loc in locations ){

						
						var coordinates = loc.split( "|");
						var items = locations[loc];
						var coords = new google.maps.LatLng( 
														coordinates[0], 
														coordinates[1] );

						add_place_marker( coords, items[0].place_name, items[0].where_addr, items[0].place_type, "", items.length, false );
						
						for( e_ind in items ){
							add_event( "event_" + items[e_ind].event_id, items[e_ind].event_html );
						}
						adjust_dates();
					} 
					already_working = false;
					console.log( "setting to false");
					setStatus( "success", "Looking for people in the area completed.", "findItems" );
				} 
			});
	} );
	return true;
}
