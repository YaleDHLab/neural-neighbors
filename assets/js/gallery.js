(function() {

      // data paths
  var randomSelectionsPath = 'https://s3-us-west-2.amazonaws.com/lab-apps/meserve-kunhardt/image-browser/captioned_random_selections/',
      nnPath = 'https://s3-us-west-2.amazonaws.com/lab-apps/meserve-kunhardt/image-browser/captioned_nearest_neighbors/',
      imagePath = 'https://s3-us-west-2.amazonaws.com/lab-apps/meserve-kunhardt/image-browser/resized-thumbs/',

      // elems
      gallery = document.querySelector('.gallery-items'), // grid item container
      slideshow = document.querySelector('.slideshow-items'), // slideshow conatiner
      guide = document.querySelector('.slideshow-guide'), // instructions elem
      
      // selectors
      galleryItemClass = 'gallery-item', // className of each grid item
      galleryImageClass = 'gallery-image', // className of each gallery image
      similarityClass = 'slideshow-similarity', // className of each similarity value
      similarityBarClass = 'similarity-bar', // className of the similarity bar
      slideshowItemClass = 'slideshow-item', // className of each slideshow item

      // parameters
      galleryImages = 30, // total number of images to display in gallery
      slideshowImages = 10, // total number of images to display in slideshow
      randomSelections = 25000, // total number of random image selections

      // state
      randomImages = null, // json that describes the gallery images
      hoveredImageFilename = null, // filename of the hovered image
      nnData = null, // data for the currently hovered image's nn
      sticking = false; // are we sticking to one selected image
  
  /**
  * Init
  **/

  loadInitialImages();

  /**
  * Add one image without src for each image to be shown
  **/

  function loadInitialImages() {
    get(getRandomImagePath(), addGalleryImages)
    addSlideshowImages();
  }

  /**
  * Add the intial gallery images
  **/

  function addGalleryImages(data) {
    randomImages = JSON.parse(data);
    _.times(galleryImages).forEach(function(i) {
      
      // add the container div
      var div = document.createElement('div');
      div.className = galleryItemClass;

      // add the image
      var img = document.createElement('img');
      img.src = imagePath + randomImages[i].image;
      img.className = galleryImageClass;
      div.appendChild(img);

      // add the caption (if available)
      if (randomImages[i].caption) {
        var caption = document.createElement('div');
        caption.className = 'caption';
        caption.innerHTML = randomImages[i].caption;
        div.appendChild(caption);
      }

      gallery.appendChild(div);
    })

    initializePackery();
    addEventListeners();
    window.setTimeout(prefetchNearestNeighbors, 500);
  }

  /**
  * Add the slideshow images
  **/

  function addSlideshowImages() {
    _.times(slideshowImages).forEach(function() {
      
      // add the container div
      var div = document.createElement('div');
      div.className = slideshowItemClass;

      // add the similarity value container
      var similarityDiv = document.createElement('div');
      similarityDiv.className = similarityClass;

      // add the similarity value bar
      var similarityBar = document.createElement('div');
      similarityBar.className = similarityBarClass;

      // add the image
      var img = document.createElement('img');
      img.src = ' ';

      // add a caption container
      var caption = document.createElement('div');
      caption.className = 'caption';

      similarityDiv.appendChild(similarityBar);
      div.appendChild(img);
      div.appendChild(similarityDiv);
      div.appendChild(caption);
      slideshow.appendChild(div);
    })
  }

  /**
  * Initialize packery
  **/

  function initializePackery() {
    var packery = new Packery(gallery, {
      itemSelector: '.' + galleryItemClass,
      transitionDuration: '0.3s'
    });

    imagesLoaded(gallery).on('progress', function() {
      packery.layout()
    })
  }

  /**
  * Add event listeners to all images
  **/

  function addEventListeners() {
    var imgs = gallery.querySelectorAll('img');
    for (var i=0; i<imgs.length; i++) {
      var img = imgs[i];
      img.addEventListener('mouseenter', function(e) {
        e.stopPropagation();
        e.preventDefault();
        handleMouseenter(this);
      })
    }

    document.body.addEventListener('click', function(e) {
      handleClick(e);
    })

    var galleryItems = document.querySelector('.gallery-items');
    galleryItems.addEventListener('mouseleave', function(e) {
      e.stopPropagation();
      e.preventDefault();
      handleMouseleave(this);
    })
  }

  /**
  * Run an xhr request and pipe the result or error to callbacks
  **/

  function get(url, handleSuccess, handleErr, handleProgress) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == XMLHttpRequest.DONE) {
        if (xmlhttp.status === 200) {
          if (handleSuccess) handleSuccess(xmlhttp.responseText)
        } else {
          if (handleErr) handleErr(xmlhttp)
        }
      };
    };

    xmlhttp.onprogress = function(e) {
      if (handleProgress) handleProgress(e);
    };

    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  };

  /**
  * Display the incoming set of random images
  **/

  function handleRandomImages(data) {
    imageData = JSON.parse(data);
    var images = gallery.querySelectorAll('img');
    for (var i=0; i<images.length; i++) {
      if (i < galleryImages) {
        images[i].src = imagePath + imageData[i];
      }
    }
  }

  /**
  * Given an image show similar images in the slideshow
  **/

  function handleMouseenter(img) {
    if (!sticking) {
      findSimilarImages(img);
    }
  }

  /**
  * Show the guide and brighten all images
  **/

  function handleMouseleave() {
    if (!sticking) {
      hoveredImageFilename = null;
      slideshow.style.display = 'none';
      
      // remove the slideshow images
      var slideshowImages = slideshow.querySelectorAll('img');
      for (var i=0; i<slideshowImages.length; i++) {
        var slideshowImage = slideshowImages[i];
        slideshowImage.src = ' ';
      }

      guide.style.display = 'block';

      // restore opacity to gallery images
      var galleryImages = gallery.querySelectorAll('img');
      for (var i=0; i<galleryImages.length; i++) {
        var galleryImage = galleryImages[i];
        galleryImage.style.opacity = 1;
      }

      // remove loaded class from slideshow image containers
      var containers = slideshow.querySelectorAll('.' + slideshowItemClass);
      for (var i=0; i<containers.length; i++) {
        var container = containers[i];
        container.className = slideshowItemClass;
      }
    }
  }

  /**
  * Highlight this image and show the captions for it and its nn
  **/

  function handleClick(e) {
    var elem = e.target;
    if (sticking) {
      sticking = false;
      clearCaptions();
    } else if (elem.className === galleryImageClass) {
      sticking = true;
      hoveredImageFilename = getFilename(elem);
      findSimilarImages(elem);
      showCaptions(elem);
    }
  }

  /**
  * Find the similar images for an image
  **/

  function findSimilarImages(img) {
    var filename = getFilename(img);
        nn = nnPath + filename.replace('.jpg','.json');
    hoveredImageFilename = filename;
    get(nn, showSimilarImages);
  }

  /**
  * Show the images that are similar to the hovered image
  **/

  function showSimilarImages(data) {
    // use the conditional to handle the race condition where user
    // mouses an image and mouses out before the packet has arrived
    if (hoveredImageFilename) {
      
      // cache the nn data
      nnData = data;

      // hide the guide
      guide.style.display = 'none';

      // display the nearest neighbors
      var nearestNeighbors = JSON.parse(data),
          containers = slideshow.querySelectorAll('.' + slideshowItemClass);

      _.take(nearestNeighbors, slideshowImages).forEach(function(nn, idx) {
        var container = containers[idx],
            img = container.querySelector('img'),
            similarity = Math.round(nn.similarity*100),
            similarityElem = ' <div class="gray-text">' + similarity + '%</div>'

        img.onload = function() {
          var parent = this.parentNode;
          var parentClass = parent.className;
          parent.setAttribute('class', parentClass + ' loaded');
        }
        img.src = imagePath + nn.filename + '.jpg';
        var caption = container.querySelector('.caption');
        if (nn.caption) {
          var parentClass = caption.parentNode.className.replace(' hidden', '');
          caption.parentNode.setAttribute('class', parentClass);
          caption.innerHTML = nn.caption + similarityElem;
        } else {
          var parentClass = caption.parentNode.className;
          caption.parentNode.setAttribute('class', parentClass);
          caption.innerHTML = 'Untitled ' + similarityElem;
        }
        var similarityBar = container.querySelector('.' + similarityBarClass);
        similarityBar.style.width = similarity + '%';
      })

      slideshow.style.display = 'block';
      highlightSelectedImage();
    }
  }

  /**
  * Darken all images except the highlighted image
  **/

  function highlightSelectedImage() {
    var images = gallery.querySelectorAll('img');
    for (var i=0; i<images.length; i++) {
      setImageOpacity(images[i]);
    }
  }

  /**
  * Darken an image if it isn't highlighted
  **/

  function setImageOpacity(img) {
    img.style.opacity = getFilename(img) === hoveredImageFilename ?
        1
      : 0.1;
  }

  /**
  * Helper that gets the filename from the src of an image
  **/

  function getFilename(img) {
    var fullSrc = img.getAttribute('src'),
        splitSrc = fullSrc.split('/'),
        filename = splitSrc[splitSrc.length-1];
    return filename;
  }

  /**
  * Get the path to a packet of random images
  **/

  function getRandomImagePath() {
    var randInt = _.random(0, randomSelections-1);
    return randomSelectionsPath + randInt + '.json';
  }

  /**
  * Show all captions for the currently clicked element
  **/

  function showCaptions(elem) {
    var bodyClass = document.body.className;
    document.body.setAttribute('class', bodyClass + ' captions');

    var parentClass = elem.parentNode.className;
    elem.parentNode.setAttribute('class', parentClass + ' captions');
  }

  /**
  * Remove displayed captions and deselect any highlighted images
  **/

  function clearCaptions() {
    handleMouseleave();
    var bodyClass = document.body.className;
    document.body.setAttribute('class', bodyClass.replace('captions',''))
  
    var items = gallery.querySelectorAll('.' + galleryItemClass);
    for (var i=0; i<items.length; i++) {
      var item = items[i];
      item.className = galleryItemClass;
    }
  }

  /**
  * Prefetch the nn for each displayed image
  **/

  function prefetchNearestNeighbors() {
    for (var i=0; i<randomImages.length; i++) {
      var file = randomImages[i].image.replace('.jpg', '.json');
      get(nnPath + file);
    }
  }

})();
