import { redirect } from '@sveltejs/kit';

// lessons are a mode of the app now
export const GET = () => redirect(301, '/i?learn');
