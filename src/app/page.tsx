import { redirect } from "next/navigation";

/** The app starts on the day's entry screen (the proxy sends signed-out visitors to the login page). */
export default function Home() {
  redirect("/saisie");
}
