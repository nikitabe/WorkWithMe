
function adjust_date( elem )
{
	// console.log( "Before --- " + $(elem).html() + " GMT" );
	var s = $(elem).html() + " GMT";
	var d = new Date( Date.parse( s ) );
	$(elem).html( d.toString( "ddd h:mm tt" ) );
	$(elem).removeClass( "adjust_date" );

	// For debugging
	//$(elem).append( d.toString( "ddd h:mm tt" ) );

	// console.log( "After --- " + $(elem).html() );
}

function adjust_dates()
{	
	$.each( $('.adjust_date'), function(){
		adjust_date( this );
	});
}
$(function () {
	console.log( "Running intro");
	adjust_dates();
});