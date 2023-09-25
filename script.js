//Answer array
var answerlist = [ "Hello", "Okay", "I'm sorry. I don't understand.", "How are you?", "Thanks", "Good morning", "Good night", "Sorry", "Yes", "No", "I'm fine. How are you?" ]

function send_text()
{
  var x = document.getElementById("message_box").value; /* gets the textbox VALUE */
  if(x!="")
  {
    var elem = document.createElement('div'); /* creates new div element */
    var text = document.createTextNode(x); /* creates the text to put into the element */
    elem.appendChild(text); /* adds the text to the element */
    elem.className = 'receiver-container'; /* adds the class to the element */
    document.getElementById("messagesdivid").appendChild(elem); /* adds element to the body */
    //Clear message box
    document.getElementById('message_box').value = "";
    //Scroll
    document.getElementById("messagesdivid").scrollTo(0,document.getElementById("messagesdivid").scrollHeight)
    document.getElementById("spanonline").innerHTML = "Typing...";
    setTimeout(answer, 1000)//Answer time (1000 = 1 seconds)
  }
  
function answer()
{
  randomanswer = answerlist[Math.round(Math.random()*10)]
  var elem = document.createElement('div'); /* creates new div element */
  var text = document.createTextNode(randomanswer); /* creates the text to put into the element */
  elem.appendChild(text); /* adds the text to the element */
  elem.className = 'receiver-container2'; /* adds the class to the element */
  document.getElementById("messagesdivid").appendChild(elem); /* adds element to the body */
  document.getElementById("messagesdivid").scrollTo(0,document.getElementById("messagesdivid").scrollHeight)
  document.getElementById("spanonline").innerHTML = "Online";
}
}