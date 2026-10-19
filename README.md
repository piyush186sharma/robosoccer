# ROBOTRON RoboSoccer

A React tournament fixture board and lightweight admin console for a RoboSoccer event. Admins control the rounds, matchups, byes, schedules, results, and when fixtures are published.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm run dev`.

Without Firebase settings, the app runs in local preview mode and stores tournament data in the browser's local storage.

## Connect Firebase Realtime Database and simple admin code

1. Create a Firebase project and a Realtime Database.
2. Copy `.env.example` to `.env.local` and fill in the web app configuration values from Firebase project settings.
3. In Realtime Database, add a root-level string field named `Security` and set its value to the code the admin should enter. For example:

   ```json
   {
     "Security": "replace-this-with-your-admin-code",
     "tournament": {
       "rounds": []
     }
   }
   ```

   In the Firebase Console, use the plus button at the database root to add the `Security` child. Set its value to a string, not an object.

4. Publish the rules in `database.rules.json` from the Realtime Database **Rules** tab (or deploy them with Firebase CLI):

   ```sh
   npm install -g firebase-tools
   firebase login
   firebase use --add
   firebase deploy --only database
   ```

5. Restart the Vite development server. Open **Admin control** and enter the value stored in `Security`. Signing out returns to the dashboard.

**Security warning:** This is a convenience-only screen lock, not secure authentication. The app must read `/Security`, so anyone can retrieve the code from the public database or browser. The rules allow anyone to write tournament data; a visitor can bypass the login and change fixtures directly. Do not use this setup for private or sensitive data. For protected admin writes, use Firebase Authentication plus server-side validation and restrictive database rules instead.

The app can still run in local preview without Firebase, but the code login requires a configured Realtime Database and a `Security` string at its root.

The admin console starts with an unpublished Round 1 and no preset teams or bracket. Add each team-vs-team match individually, set dates, kickoff times and venue, and add any number of teams to that round's byes list. Publish the round when it is ready. Only published rounds are visible on the public dashboard; match details, live scores, results, and byes remain editable and sync to the dashboard after publishing.

After publishing a round, use **Add next round** to create another round. Add its matchups and bye teams manually and publish when ready. This flow does not assume a fixed number of rounds, teams, or byes.

Completed matches show scores and the admin-selected winner on the public fixture board.
