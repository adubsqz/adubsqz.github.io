import { useState } from 'react';
import { submitContactMessage } from '../inquireStatic';
import { FilmTvClearanceBlock, RightsReservedBlock, TearsheetAndFulfillmentGrid } from './LicensingDetails';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';

interface ContactModalProps {
  onClose: () => void;
  initialSubject?: string;
  initialMessage?: string;
}

export default function ContactModal({ onClose, initialSubject = '', initialMessage = '' }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitContactMessage({ name, email, subject, message: content });
      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose();
  };

  if (sent) {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-xl p-8">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Message sent</DialogTitle>
            <DialogDescription className="text-sm text-photo-muted">
              Check adubsqz@gmail.com (and spam). If nothing arrives, Send again and your mail app will open.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" className="mt-6" onClick={onClose}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
      <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-photo-border bg-photo-panel px-5 py-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-2xl">
              Contact
            </DialogTitle>
            <DialogDescription className="text-sm text-photo-muted normal-case tracking-normal">
              Say hi. It goes to adubsqz@gmail.com.
            </DialogDescription>
          </DialogHeader>
          <Button aria-label="Close" className="h-8 px-2 text-lg leading-none" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-sm text-photo-muted">
              Name
            </label>
            <Input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm text-photo-muted">
              Email
            </label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="contact-subject" className="mb-1.5 block text-sm text-photo-muted">
              Subject
            </label>
            <Input
              id="contact-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's this about?"
              required
            />
          </div>
          <div>
            <label htmlFor="contact-content" className="mb-1.5 block text-sm text-photo-muted">
              Message
            </label>
            <Textarea
              id="contact-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-y"
              placeholder="Your message..."
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md normal-case tracking-normal"
              variant="ghost"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-md normal-case tracking-normal"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-photo-muted">Rights and terms</summary>
            <div className="mt-3 space-y-3">
              <FilmTvClearanceBlock />
              <p className="text-[0.7rem] leading-relaxed text-photo-muted">
                Licensing and custom terms stay private. No public checkout.
              </p>
              <TearsheetAndFulfillmentGrid surface="modal" />
              <RightsReservedBlock className="bg-photo-bg/50" />
            </div>
          </details>
        </form>
      </DialogContent>
    </Dialog>
  );
}
