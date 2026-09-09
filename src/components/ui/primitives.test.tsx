import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { Card, CardContent, CardHeader } from './card';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';

describe('ui primitives', () => {
  it('renders button variants and sizes', () => {
    render(
      <>
        <Button>Default</Button>
        <Button variant="outline" size="sm">
          Outline
        </Button>
        <Button variant="ghost" size="lg">
          Ghost
        </Button>
        <Button variant="lightbox">Lightbox</Button>
        <Button variant="lightboxPrimary">Primary</Button>
        <Button variant="inquirySubmit">Submit</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Default' }).className).toMatch(/mcm-brick/);
    expect(screen.getByRole('button', { name: 'Primary' }).className).toMatch(/mcm-brick/);
    expect(screen.getByRole('button', { name: 'Submit' }).className).toMatch(/mcm-brick/);
    expect(screen.getByRole('button', { name: 'Default' }).className).not.toMatch(/uppercase/);
  });

  it('renders form controls and card shells', () => {
    render(
      <Card>
        <CardHeader>Head</CardHeader>
        <CardContent>
          <Input aria-label="name" />
          <Select aria-label="size">
            <option>a</option>
          </Select>
          <Textarea aria-label="notes" />
        </CardContent>
      </Card>,
    );
    expect(screen.getByLabelText('name')).toBeInTheDocument();
    expect(screen.getByLabelText('size')).toBeInTheDocument();
    expect(screen.getByLabelText('notes')).toBeInTheDocument();
  });

  it('opens a dialog from a trigger', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogFooter>Foot</DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    screen.getByRole('button', { name: 'Open' }).click();
    expect(await screen.findByText('Title')).toBeInTheDocument();
  });
});
