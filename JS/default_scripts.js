
function adjust_date( elem )
{
	// console.log( "Before --- " + $(elem).html() + " GMT" );
	var d = new Date( $(elem).html() + " GMT" );
	$(elem).html( d.toString( "ddd h:mm tt" ) );
	// console.log( "After --- " + $(elem).html() );
}

$(function () {
	console.log( "Running intro");
	$.each( $('.adjust_date'), function(){
		adjust_date( this );
	});
});