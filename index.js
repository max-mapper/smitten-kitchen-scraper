var $ = require('cheerio')
var request = require('request')
var fs = require('fs')
var async = require('async')

var recipesURL = "http://smittenkitchen.com/recipes"

request(recipesURL, function(err, resp, body) {
  var recipeLinks = getRecipeLinks(body)
  fs.writeFileSync('recipeLinks.json', JSON.stringify(recipeLinks))
  downloadRecipes(recipeLinks)
})

function downloadRecipes(recipeLinks) {
  var posts = {}
  var recipes = Object.keys(recipeLinks)
  var pending = recipes.length
  var queue = async.queue(function(link, cb) {
    request(link.href, function(err, resp, body) {
      console.log(pending--)
      if (err) return cb(err)
      var html = $.load(body.toString())
      var post = html('.post').html()
      posts[link.title] = {html: post, href: link.href}
      fs.writeFileSync('posts/' + link.title + '.html', post)
      cb(false)
    })
  }, 5)
  recipes.map(function(link) { 
    queue.push({title: recipeLinks[link], href: link})
  })
  queue.drain = function() {
    console.log('done')
  }
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