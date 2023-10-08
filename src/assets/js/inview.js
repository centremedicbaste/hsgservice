
let observedElements = document.querySelectorAll('.inview');


const options = { 
  threshold: 0.5
}
const inViewCallback = entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { 
      entry.target.classList.add('is-inview');  

   }
    else { 
      // OPTIONAL,
   }
  });
}

let observer = new IntersectionObserver(inViewCallback,options); 
observedElements.forEach(element => {
  observer.observe(element) // run the observer 
});