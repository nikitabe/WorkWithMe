
$(function () {
	map_init_resources( 'map_canvas');
	map_center_on_me( function(){
		onDragAround( false );			

		// Need to call listener because that is when the bounds actually change
		// Not using bounds_changed because http://stackoverflow.com/questions/4338490/google-map-event-bounds-changed-triggered-multiple-times-when-dragging
		google.maps.event.addListener(map, 'dragend', function(){ onDragAround(true); } );
		google.maps.event.addListener(map, 'zoom_changed', function(){
															if( !already_working){
																already_working = true;
																setTimeout("onDragAround(true)", 500);
															}
														} );

	});

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
		
	

});

function onDragAround( update_status )
{
	console.log( "onDragAround");
	find_users_on_map( update_status );
	if( $("#where").val().length > 0 )
		perform_search( false );
}

function search_for_stuff()
{
	clear_place_markers( CLEAR_WITHOUT_USERS );
	if( $("#where").val().length > 0 )
		perform_search( true );
}

function perform_search( adjust_map )
{
	$( "#search_results" ).slideUp('fast', function(){
		$( "#search_results" ).html( "" );					
		map_find_places( $("#where").val(), adjust_map, process_places_result, find_via_address );	
	});
	
	// Clean up invisible markers
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

function find_via_address( adjust_map )
{
	map_find_via_address( $("#where").val(), adjust_map, process_address_result, found_nothing )
}

function process_places_result( result_list, s, adjust_map )
{
	console.log( "process_places_result" );
	var bounds = map.getBounds();
	var place_id = "";
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
		
		if( !lookup_place[place_id] ){
			add_place_marker( loc, name, address, type, "", 0, false );
		}

		// This is probably wrong.  Selector should be UL under #searchResults
		$( "#search_results" ).append( "<tr><td>" + 
		"<div class='map_info_place_name'><a onclick=\"displayPlaceByID('" + place_id + "')\">" + name + "</a></div>" + 
				"<div class='map_info_address'>" + address + "</div>" + 
		"</td></tr>" );
	}


	if( adjust_map ){
		map.fitBounds( bounds );
		if( result_list.length == 1 ){
			displayPlaceByID( place_id );
		}
	}

	$( "#search_results" ).slideDown('slow');
	
}

function process_address_result( result_list, s, adjust_map )
{
   console.log( "process_address_result" );
   var dBounds = new google.maps.LatLngBounds();
	var place_id = "";
	for( j in result_list ){
		var r = result_list[j];
		var address = r.formatted_address; 
		var loc = r.geometry.location;
		
		// This is probably wrong.  Selector should be UL under #searchResults
		$( "#search_results" ).append( "<tr><td>" + address + "</td></tr>" );

		place_id = get_place_id( loc, name ); 
		// console.log( "Found address: %s at %s: " % (name, place_id) );


		if( !lookup_place[place_id] ){
			add_place_marker( loc, "", address, "", "", 0, false );
		}

	}

	if( result_list.length == 1 && adjust_map ){
		displayPlaceByID( place_id );
	}

	$( "#search_results" ).slideDown('slow');
	if( adjust_map ){
		map.panTo( result_list[0].geometry.location );

		if( map.getZoom() > default_zoom )
			map.setZoom( default_zoom );
	}
	
	find_users_on_map( true );

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

function perform_user_search(update_status)
{	
	var show_history = "";
	if( $("#show_history").val() ){
		show_history = "&show_history=1";
	}

	var bounds = map.getBounds();
//	console.log( "got bounds: " + bounds );

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
				$( "#events_table" ).html( "" );
				var locations = eval( items_json );
				var dynamic_event_id = 0;
				
				for( var loc in locations ){
					
					var coordinates = locations[loc][0].split( "|");
					var items = locations[loc][1];
					var coords = new google.maps.LatLng( 
													coordinates[1], 
													coordinates[2] );

					add_place_marker( coords, items[0].place_name, items[0].where_addr, items[0].place_type, "", items.length, false );
					
					for( e_ind in items ){
						// event_id is not correctly set on the backend.  Fix that if you want to use it.
						add_event( "event_" + dynamic_event_id++ /*items[e_ind].event_id*/, items[e_ind].event_html );
					}
				} 
				adjust_dates();
				already_working = false;
				console.log( "setting to false");
				if( update_status ) setStatus( "success", "Looking for people in the area completed.", "findItems" );
			} 
		});
}

function find_users_on_map( update_status )
{
	already_working = false;
	console.log( "aw = " + already_working );
	
	//clear_place_markers( CLEAR_WITH_USERS );
	
	
	$( "#events_table" ).html( "<tr><td>Loading...</td></tr>" );
	console.log( "find_users_on_map: looking for items around");
	if( update_status ) setStatus( "working", "Working...", "findItems", function(){ perform_user_search(update_status); } );
	else perform_user_search(update_status);

	return true;
}
