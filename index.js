var $ = require('cheerio')
var request = require('request')
var fs = require('fs')
var async = require('async')

var recipesURL = "http://smittenkitchen.com/recipes"

request(recipesURL, function(err, resp, body) {
  var recipeLinks = getRecipeLinks(body)
  downloadRecipes(recipeLinks)
})

var queue = async.queue(function(link, cb) {
  if (link.href.match(/(png|jpg)$/i)) return downloadImage(link, cb)
  downloadRecipe(link, cb)
}, 5)

queue.drain = function() {
  console.log('done')
}

function queueJob(link) {
  queue.push(link, function(err) {
    if (err) console.error(link, err)
    else console.log('finished', link.title)
    console.log('queue length: ', queue.length())
  })
}

function downloadRecipes(recipeLinks) {
  var recipes = Object.keys(recipeLinks)
  // recipes.map(function(link) {
  queueJob({title: recipeLinks[recipes[0]], href: recipes[0]})
  queueJob({title: recipeLinks[recipes[1]], href: recipes[1]})
  // })
}

function downloadImage(link, cb) {
  request(link.href)
    .pipe(fs.createWriteStream('posts/' + link.title))
    .on('end', cb)
    .on('error', cb)
}

function downloadRecipe(link, cb) {
  request(link.href, function(err, resp, body) {
    if (err) return cb(err)
    var html = $.load(body.toString())
    var post = html('.post')
    var postHTML = $.load(post.html())
    postHTML('img').map(function(i, img) {
      img = $(img)
      var src = img.attr('src')
      var title = src.split('/')
      title = title[title.length - 1]
      if (src.match(/(png|jpg)$/i)) {
        queueJob({title: title, href: src})
        img.attr('src', title)
      }
    })
    fs.writeFileSync('posts/' + link.title + '.html', postHTML.html())
    cb(false)
  })
}

function getRecipeLinks(body) {
  var html = $.load(body.toString())
  var recipes = {}
  html('li a').map(function(i, link) {
    link = $(link)
    var href = link.attr('href')
    var title = link.text()
    if (!href.match('http://smittenkitchen.com/blog/')) return
    recipes[href] = title
  })
  return recipes
}