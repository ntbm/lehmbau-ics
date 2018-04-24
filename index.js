const ical = require('ical-generator')
const express = require('express')
const request = require('request')
const { StringDecoder } = require('string_decoder')
const decoder = new StringDecoder('utf8')
const cheerio = require('cheerio')
const moment = require('moment')


const loginName = process.env.NAME
const birthDate = process.env.DATE

const headers = {
  'Pragma': 'no-cache',
  'Origin': 'http://www.stundenplan-lehmbaugruppe.de',
  'Accept-Encoding': 'gzip, deflate',
  'Accept-Language': 'en-DE,en;q=0.9,de-DE;q=0.8,de;q=0.7,en-US;q=0.6',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,/;q=0.8',
  'Cache-Control': 'no-cache',
  'Referer': 'http://www.stundenplan-lehmbaugruppe.de/index.html',
  'Connection': 'keep-alive',
  'DNT': '1'
}

const dataString = `action=login&name=${loginName}&geb=${birthDate}&rememberlogin=1`

let cal = ical({name: 'stundenplan', timezone: 'DE'})
let cookieJar = request.jar()

let options = {
  url: 'http://www.stundenplan-lehmbaugruppe.de',
  method: 'POST',
  headers: headers,
  body: dataString,
  jar: cookieJar
}

function callback(error, response, body) {
  let newCal = ical({name: 'stundenplan', timezone: 'DE'})
  if (!error && response.statusCode == 302) {
    request({
      url: 'http://www.stundenplan-lehmbaugruppe.de/index.html',
      jar: cookieJar
    }, (error, response, body) => {
      const $ = cheerio.load(body)
      // console.log($('#plan')[0].children)
      let plan = {}
      $('#plan')[0].children.forEach(item => {
        if (item.name === 'div') return
        let date = item.children[1].data.trim()
        let rows = item.next.children[0].children[0].children
        let events = rows.map(row => {
          if (!row || !row.name) return
          let data = row.children
          let result = {}
          let [start, end] = data[0].children[0].data.split(' - ')
          result.start = moment(`${date} ${start}`, 'DD.MM.YYYY HH:mm')
          result.end = moment(`${date} ${end}`, 'DD.MM.YYYY HH:mm')
	  //if(moment(`${date}`, 'DD.MM.YYYY').isDST()){
	    //result.start.add(1, 'h')
	    //result.end.add(1, 'h')
	  //}
	  result.start = result.start.toDate()
	  result.end = result.end.toDate()
          result.summary = data[1].children[0].data
	  result.timezone = 'DE'
          result.location = data[2].children[0].data
          return result
        })
        events.forEach(event => {
		console.log(event)
          newCal.createEvent(event)
        })
      })
      cal = newCal
    })
  }
}

request(options, callback)
console.log(`Parse new Calender ${new Date()}`)
setInterval(() => {
  console.log(`Parse new Calender ${new Date()}`)
  request(options, callback)
}, 1000*60*60)
let app = express()
app.set('tz', 'DE')
app.get('/', (req, res) => {
	console.log(`Get Calender ${new Date()}`)
  cal.serve(res)
})
app.listen(3004, () => {
  console.log('Server started')
})
