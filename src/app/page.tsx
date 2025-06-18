
import ChatInterface from '@/components/chat-interface';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function Home() {
  return (
    // SidebarProvider now wraps the ChatInterface, which handles its own mode and content.
    <SidebarProvider defaultOpen={true}>
      <ChatInterface />
    </SidebarProvider>
  );
}

    