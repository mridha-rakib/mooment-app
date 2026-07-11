# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the Android development build over USB

   ```bash
   npm run android
   ```

This starts Metro for `http://127.0.0.1:8081`, installs or updates the Android
development build, configures:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4000 tcp:4000
```

and opens the development client with the explicit ADB-reversed Metro URL. Use
`npm run reload:android` for later reloads while Metro is already running.

The default `npm start` also uses the ADB-reversed host. Use `npm run start:lan` only
when the Android device can directly reach this machine's LAN IP, or
`npm run start:tunnel` when USB/local network routing is not reliable.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
