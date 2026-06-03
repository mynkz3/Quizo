import { io } from 'socket.io-client';

// Derive the backend URL from the host the page was opened on, so phones
// reaching the dev server at http://<pc-ip>:5173 talk to the API at the same
// IP rather than to themselves (localhost).
export const SERVER_URL = `http://${window.location.hostname}:3001`;

// One shared connection for the whole app.
const socket = io(SERVER_URL);

export default socket;
