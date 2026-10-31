import { useState, useEffect } from 'react';
import type { Photo } from '../types';
import { submitPrintInquiry } from '../inquireStatic';
import {
  defaultPrintSize,
  MORE_SIZING_OPTIONS_HINT,
  offeredPrintSizes,
  usesConservativePrintSizes,
  type PrintSize,
} from '../printSizes';
import { FilmTvClearanceBlock, RightsReservedBlock, TearsheetAndFulfillmentGrid } from './LicensingDetails';
import WatermarkedImage from './WatermarkedImage';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select } from './ui/select';
import { Textarea } from './ui/textarea';

interface InquiryModalProps {
  photo: Photo;
  /** Seed the notes field (e.g. tearsheet inquiry from the lightbox) */
  initialNotes?: string;
  onClose: () => void;
}

type PrintMedium = 'fine-art-paper' | 'canvas' | 'metal' | 'acrylic';
type PrintFinish = 'matte' | 'gloss' | 'lustre';

/** 16px type + 44px-tall controls so iOS does not zoom and thumbs can hit the sheet. */
const MOBILE_FIELD_CLASS = 'min-h-11 px-4 py-2.5 text-base sm:text-sm';

export default function InquiryModal({ photo, initialNotes, onClose }: InquiryModalProps) {
  const printSizeOptions = offeredPrintSizes(photo.masterWidth, photo.masterHeight);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [printSize, setPrintSize] = useState<PrintSize>(() =>
    defaultPrintSize(photo.masterWidth, photo.masterHeight),
  );
  const [customSize, setCustomSize] = useState('');
  const [printMedium, setPrintMedium] = useState<PrintMedium>('fine-art-paper');
  const [printFinish, setPrintFinish] = useState<PrintFinish>('matte');
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes ?? '');
    setPrintSize(defaultPrintSize(photo.masterWidth, photo.masterHeight));
  }, [initialNotes, photo.id, photo.masterWidth, photo.masterHeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitError(null);

    try {
      const size = printSize === 'custom' ? customSize : printSize;
      await submitPrintInquiry({
        photo,
        name,
        email,
        company,
        shippingAddress: shippingAddress.trim() || '(to confirm after quote)',
        size,
        printMedium,
        printFinish,
        notes,
      });
      setSubmitStatus('success');
    } catch (error) {
      console.error('Inquiry submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit inquiry');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl p-8">
          <div className="space-y-4 text-center">
            <DialogTitle className="font-display text-2xl">Quote request sent</DialogTitle>
            <p className="text-sm leading-relaxed text-photo-muted">
              Thanks — I&apos;ll reply by email with size options and an invoice. Keep an eye on{' '}
              {email.trim() || 'your inbox'}.
            </p>
            <Button type="button" onClick={onClose} className="min-h-11 px-6">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent
        data-inquiry-sheet
        className="fixed inset-0 z-[110] flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 touch-manipulation sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(94dvh,56rem)] sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-photo-border bg-photo-panel px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5">
          <DialogHeader className="min-w-0 space-y-1">
            <DialogTitle className="font-display mb-1">Request a print quote</DialogTitle>
            <DialogDescription className="text-sm tracking-wide text-photo-muted">
              No payment yet — I&apos;ll email size, price, and an invoice.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 w-11 min-h-11 min-w-11 shrink-0 px-0 text-lg leading-none"
            variant="ghost"
            aria-label="Close"
          >
            ×
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="flex flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden lg:h-full">
              <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-photo-border px-4 py-4 sm:px-6 lg:min-h-0 lg:w-[min(100%,26rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-5">
                <WatermarkedImage
                  src={photo.src}
                  alt=""
                  loading="eager"
                  decoding="sync"
                  wrapperClassName="relative w-full overflow-hidden rounded-xl bg-photo-panel"
                  className="max-h-40 w-full object-contain sm:max-h-52 lg:max-h-60"
                />
                <div className="border-b border-photo-border pb-3">
                  <p className="mb-1 text-sm tracking-wide text-photo-muted">Selected print</p>
                  <p className="text-sm italic leading-snug text-photo-fg">{photo.alt}</p>
                </div>
                <div className="flex flex-col gap-4">
                  <FilmTvClearanceBlock />
                  <TearsheetAndFulfillmentGrid surface="modal" className="md:grid-cols-1" />
                  <RightsReservedBlock className="bg-photo-bg/50" />
                </div>
              </aside>

              <div className="min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-contain">
                <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 lg:py-5">
                  <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {submitStatus === 'error' && 'There was an error submitting your inquiry.'}
                  </div>

                  <p className="text-sm leading-relaxed text-photo-muted">
                    Tell me who you are and which size you want. Shipping comes after we lock the quote.
                  </p>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="inquiry-name" className="mb-2 block text-sm tracking-wide text-photo-muted">
                        Full name <span className="text-photo-muted">*</span>
                      </label>
                      <Input
                        id="inquiry-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={MOBILE_FIELD_CLASS}
                        placeholder="Your name"
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <label htmlFor="inquiry-email" className="mb-2 block text-sm tracking-wide text-photo-muted">
                        Email <span className="text-photo-muted">*</span>
                      </label>
                      <Input
                        id="inquiry-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={MOBILE_FIELD_CLASS}
                        placeholder="you@studio.com"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="inquiry-company" className="mb-2 block text-sm tracking-wide text-photo-muted">
                      Company / organization
                    </label>
                    <Input
                      id="inquiry-company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className={MOBILE_FIELD_CLASS}
                      placeholder="Studio or brand (optional)"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="inquiry-size" className="mb-2 block text-sm tracking-wide text-photo-muted">
                      Print size <span className="text-photo-muted">*</span>
                    </label>
                    <Select
                      id="inquiry-size"
                      value={printSize}
                      onChange={(e) => setPrintSize(e.target.value as PrintSize)}
                      className={MOBILE_FIELD_CLASS}
                      required
                      disabled={isSubmitting}
                    >
                      {printSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {usesConservativePrintSizes(photo.masterWidth, photo.masterHeight) && (
                      <p className="mt-2 text-xs leading-relaxed text-photo-muted">{MORE_SIZING_OPTIONS_HINT}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="inquiry-medium" className="mb-2 block text-sm tracking-wide text-photo-muted">
                        Print medium
                      </label>
                      <Select
                        id="inquiry-medium"
                        value={printMedium}
                        onChange={(e) => setPrintMedium(e.target.value as PrintMedium)}
                        className={MOBILE_FIELD_CLASS}
                        disabled={isSubmitting}
                      >
                        <option value="fine-art-paper">Fine art paper</option>
                        <option value="canvas">Canvas</option>
                        <option value="metal">Metal</option>
                        <option value="acrylic">Acrylic</option>
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="inquiry-finish" className="mb-2 block text-sm tracking-wide text-photo-muted">
                        Finish
                      </label>
                      <Select
                        id="inquiry-finish"
                        value={printFinish}
                        onChange={(e) => setPrintFinish(e.target.value as PrintFinish)}
                        className={MOBILE_FIELD_CLASS}
                        disabled={isSubmitting}
                      >
                        <option value="matte">Matte</option>
                        <option value="gloss">Gloss</option>
                        <option value="lustre">Lustre</option>
                      </Select>
                    </div>
                  </div>

                  {printSize === 'custom' && (
                    <div>
                      <label
                        htmlFor="inquiry-custom-size"
                        className="mb-2 block text-sm tracking-wide text-photo-muted"
                      >
                        Custom dimensions <span className="text-photo-muted">*</span>
                      </label>
                      <Input
                        id="inquiry-custom-size"
                        type="text"
                        value={customSize}
                        onChange={(e) => setCustomSize(e.target.value)}
                        className={MOBILE_FIELD_CLASS}
                        placeholder="e.g., 30×40 inches, or a locket"
                        required={printSize === 'custom'}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="inquiry-address" className="mb-2 block text-sm tracking-wide text-photo-muted">
                      Shipping address <span className="font-normal text-photo-muted">(optional for now)</span>
                    </label>
                    <Textarea
                      id="inquiry-address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      rows={3}
                      className={`resize-y ${MOBILE_FIELD_CLASS}`}
                      placeholder="Add later when we confirm size and price"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="inquiry-notes" className="mb-2 block text-sm tracking-wide text-photo-muted">
                      Notes
                    </label>
                    <Textarea
                      id="inquiry-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className={`resize-y ${MOBILE_FIELD_CLASS}`}
                      placeholder="Framing, quantity, deadline, licensing context…"
                      disabled={isSubmitting}
                    />
                  </div>

                  {submitStatus === 'error' && (
                    <div
                      className="rounded-lg border border-mcm-brick/40 bg-mcm-brick/10 p-3"
                      role="alert"
                    >
                      <p className="text-sm leading-relaxed text-photo-fg">
                        {submitError ??
                          'Could not send the request. Try again, or email adubsqz@gmail.com.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div
            data-inquiry-actions
            className="sticky bottom-0 z-10 shrink-0 border-t border-photo-border bg-photo-panel/95 px-4 py-4 backdrop-blur-sm sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-12 flex-1 px-5 py-3 text-base sm:text-sm"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 flex-1 px-5 py-3 text-base sm:text-sm"
                variant="inquirySubmit"
              >
                {isSubmitting ? 'Sending…' : 'Send quote request'}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs leading-snug text-photo-muted">
              Invoice by email after we confirm — Zelle or Venmo.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
