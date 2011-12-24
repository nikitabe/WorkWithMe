// Sets the current status sliding down the right panel
function setStatus( type, status_str, function_name, complete_func )
{
	console.log( function_name + ": " + type + ": " + status_str );
	$("#map_working").slideUp( 'fast', function(){
		$("#map_success").slideUp( 'fast', function(){
			$("#map_error").slideUp( 'fast', function(){
				// Set text
				$("#map_" + type ).html( status_str ).slideDown( 'slow', function(){
					if( complete_func ) complete_func();
					} );
					// Add a roller!
				if( type == "working" ){
					$( "#map_working" ).append( '<img src="/images/ajax-loader.gif" />' )
				}

			});
		});
	});
}
