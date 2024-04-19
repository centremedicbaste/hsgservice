

AOS.init();

console.log("Hola, mundo!");


document.body.onscroll = function () {
  if (
    document.body.scrollTop >= 50 ||
    document.documentElement.scrollTop >= 50
  ) {
    document.body.classList.add("scrolled");
  } else {
    document.body.classList.remove("scrolled");
  }
};


var swiper = new Swiper(".swiper-container", {
    spaceBetween: 15,
    slidesPerView: "2.5",

    loop: false,
    // autoHeight: true,
    pagination: {
      el: ".actuals .swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-arrows .swiper-next",
      prevEl: ".swiper-arrows .swiper-prev",
    },
    breakpoints: {

      768: {
        slidesPerView: 3,
        spaceBetween: 15,
        centeredSlides: false,
        pagination: false,
      },
      980: {
        slidesPerView: 4,
        spaceBetween: 30,
        centeredSlides: false,
        pagination: false,
      },
      1200: {
        slidesPerView: 4,
        spaceBetween: 30,
        centeredSlides: false,
        pagination: false,
        loop: false,
      },
      1600: {
        slidesPerView: 4,
        spaceBetween: 30,
        centeredSlides: false,
        pagination: false,
        loop: false,
      },
    },
  });

  $("#menu-toggle").click(function () {
    $("body").toggleClass("menu-open");
  });


  $(".google-seemore").click(function () {
    $(this).parent().toggleClass("google-open");
  });




  $(document).ready(function () {
    initvideo();

      $(".accordion-header").click(function(){
      if($(this).parent().parent().hasClass("active")){
        $(this).parent().parent().removeClass("active");
      } else {
        $(".accordion").removeClass("active");
        $(this).parent().parent().addClass("active");
      }
    })

    $('.counter').each(function() {
      var $this = $(this),
          countTo = $this.attr('data-count');
      
      $({ countNum: $this.text()}).animate({
        countNum: countTo
      },
    
      {
    
        duration: 6000,
        easing:'linear',
        step: function() {
          $this.text(Math.floor(this.countNum));
        },
        complete: function() {
          $this.text(this.countNum);
          //alert('finished');
        }
    
      });  
      
      
    
    });



  });
  
  function initvideo() {
    $(".action--play").click(function () {
      $(".video-wrap").addClass("video-wrap--show");
      $(".video-wrap").removeClass("video-wrap--hide");
      $(".video-player").attr("src", $(this).data("src"));
      $(".video-player source").attr("src", $(this).data("src"));
      $(".video-player").get(0).play();
    });
    $(".action--close").click(function () {
      $(".video-wrap").addClass("video-wrap--hide");
      $(".video-wrap").removeClass("video-wrap--show");
      $(".video-player").get(0).pause();
    });
  }


  const body = document.querySelector('body');

// Guardar la posición actual del scroll
let scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

// Función para manejar el evento de scroll
const handleScroll = () => {
  // Obtener la nueva posición del scroll
  const newScrollPosition = window.pageYOffset || document.documentElement.scrollTop;

  // Comparar la posición actual con la nueva posición para determinar la dirección del scroll
  if (newScrollPosition > scrollPosition) {
    // Scroll hacia abajo
    body.classList.remove('scroll-up');
    body.classList.add('scroll-down');
  } else {
    // Scroll hacia arriba
    body.classList.remove('scroll-down');
    body.classList.add('scroll-up');
  }

  // Actualizar la posición actual del scroll
  scrollPosition = newScrollPosition;
};

// Agregar el listener al evento de scroll
window.addEventListener('scroll', handleScroll);
  

$(window).on('scroll', function() {

  var currentScroll = $(window).scrollTop();
  var mainHeight = $('main.main-container').height();
  var elemWidth = $('.slide-gallery .images-line .row-elem').width();
  var percentageScroll = currentScroll / mainHeight;
  var totalScroll = elemWidth * percentageScroll;

  var topLine = $('.imginicio');
  var bottomLine = $('.slide-gallery .images-line.bottom-line .inner-gallery-holder');

  TweenMax.to(topLine, .8, {
      x: totalScroll,
  });

  TweenMax.to(bottomLine, 1.0, {
      x: -totalScroll,
  });

})