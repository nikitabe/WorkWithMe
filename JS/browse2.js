
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
	google.maps.event.addListener(map, 'dragend', find_users_on_map );
	google.maps.event.addListener(map, 'zoom_changed', function(){
														if( !already_working){
															already_working = true;
															setTimeout("find_users_on_map()", 500);
														}
													} );

});

function search_for_stuff()
{
	clear_place_markers( CLEAR_WITHOUT_USERS );
	find_places( $("#where").val(), process_places_result, find_via_address );
	// First search places
		// If place is found, display
		// If place is not found, search using address
			// Display output
	
}

function find_via_address()
{
	
}

function process_places_result( result_list, s )
{
	// Cycle through all results and add them to the map as appropriate
    for (var i = 0; i < result_list.length; i++) {
		var p = result_list[i];
		// Get the data
		var loc = p.geometry.location,
		 	name = p.name,
			type = p.types[0],
			address = p.vicinity;
		
		add_place_marker( loc, name, address, type, "", 0, false );
	}
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
	
	clear_place_markers( CLEAR_WITH_USERS );
	
	
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
					clear_place_markers( CLEAR_WITH_USERS );
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
