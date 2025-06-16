
import ChatInterface from '@/components/chat-interface';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function Home() {
  return (
    <SidebarProvider defaultOpen={true}>
      <ChatInterface />
    </SidebarProvider>
  );
}
