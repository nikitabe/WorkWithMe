function do_send( u, msg )
{
	if( msg == "" ){
		displayMsg( 'error', "Please enter some content.");
		return;
	}
	 
	$.ajax({
	  url: "/conversation",
	  type: "POST",
	  data: { 
		username: u,
		message: msg
		},
	  success: function( msg ){
		if( msg == "OK"){
			$('#message').slideUp( 'slow', function(){
				$('#message').val( "" );
				$('#message').slideDown( 'slow' );
			});
			displayMsg( 'success', "Email sent successfully" );
		}
		else{
			displayMsg( "error", "Error: " + msg );
		}
	  }
	});

}

function displayMsg( type, msg ){
	$('#sent_msg').slideUp( 'fast', function(){
		$('#sent_msg p').html( msg );
		$('#sent_msg').removeClass( 'error' ).removeClass( 'success' );
		$('#sent_msg').addClass( type );
		$('#sent_msg').slideDown('slow');
	});
}