import { getNavigation, getSetting } from "../lib/content";
import HeaderBar from "./HeaderBar";

export default function Header() {
  return <HeaderBar name={getSetting("site_name")} links={getNavigation("header")} />;
}
