# Data Fetcher for WeatherHub Observer

Fetch your device data directly from the [WeatherHub Observer platform](https://www.wh-observer.de).

You can add your own code to store the data to MySQL, Redis, MongoDB or just feel free to do what ever you want with your data.

## Installing

Clone or download the repo:

```bash
git clone https://github.com/xairoo/weatherhub-observer-data-fetcher.git
```

Install all depencies:

```bash
npm install
```

Add your username and password into the `.env` file:

```text
AUTH_USERNAME=my@mail.com
AUTH_PASSWORD=your_password
```

Check the WeatherHub Observer platform [devices list](https://www.wh-observer.de/devices) for your account to get your device IDs and add the device IDs you want to fetch into the devices array inside `app.js`:

```js
const devices = ['090005AC99E2', '...'];
```

Run the script:

```bash
npm start
```

## Data Conversation

All keys will be lowercased and all values will be converted to a number if possible.

The keys will be in English, German or French, depending on your [account settings](https://www.wh-observer.de/Account/Settings), change this if you want.

Sample data:

```js
{
    timestamp: 2021-05-06T15:55:42.000Z,
    temperature: 26.2,
    temperature_probe: 24.7,
    humidity: 66
}
```

## Custom Actions

Have a look at `app.js` if you want to submit the data to MySQL, Redis, ...

Just search for this comment:

```js
// Send the current `row` to MySQL, MongoDB, Redis, ...
// or send using websocket to your weather station
```
