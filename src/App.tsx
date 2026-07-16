import { UserProvider } from "./lib/UserContext";
import { AppContent } from "./AppContent";

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
