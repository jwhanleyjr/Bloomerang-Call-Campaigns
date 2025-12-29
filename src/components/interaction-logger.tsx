
"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Wand2, Loader2, Save, Gift, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Donor, Interaction } from '@/lib/types';
import { getAiSuggestion, logInteraction } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const interactionSchema = z.object({
  outcome: z.enum(['completed', 'left-vm', 'no-answer', 'bad-number'], {
    required_error: "You need to select a call outcome."
  }),
  notes: z.string().min(10, 'Please provide some notes about the interaction.').max(500),
  nextStep: z.string().optional(),
  followUpDate: z.date().optional(),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

type InteractionLoggerProps = {
  isOpen: boolean;
  onClose: () => void;
  donor: Donor;
  onInteractionLogged: (donor: Donor, interaction: Interaction) => void;
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex flex-col items-center justify-center p-3 text-center bg-muted/50 rounded-lg">
    <div className="text-primary">{icon}</div>
    <p className="text-sm font-semibold mt-1">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default function InteractionLogger({ isOpen, onClose, donor, onInteractionLogged }: InteractionLoggerProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<InteractionFormData>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      notes: '',
      nextStep: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        notes: '',
        nextStep: '',
        outcome: undefined,
        followUpDate: undefined,
      });
    }
  }, [isOpen, donor, form]);

  const handleSuggestion = async () => {
    setIsSuggesting(true);
    const { outcome, notes } = form.getValues();
    if (!outcome) {
      toast({
        variant: 'destructive',
        title: 'Select an Outcome',
        description: 'Please select a call outcome before generating a suggestion.',
      });
      setIsSuggesting(false);
      return;
    }
    
    try {
      const result = await getAiSuggestion({
        callOutcome: outcome,
        notes: notes,
        previousInteractions: donor.lastInteraction?.notes || 'No previous interactions.',
      });
      if (result.suggestedCopy) {
        form.setValue('notes', result.suggestedCopy, { shouldValidate: true });
        toast({
          title: 'Suggestion applied!',
          description: 'The AI-generated notes have been added.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: 'Could not generate AI suggestion. Please try again.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const onSubmit = async (data: InteractionFormData) => {
    setIsSaving(true);
    try {
      const newInteraction = await logInteraction({
        donorId: donor.id,
        ...data,
      });

      onInteractionLogged(donor, newInteraction);
      toast({
        title: 'Interaction Logged',
        description: `Successfully logged call for ${donor.name}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the interaction. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-full flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Log Interaction: {donor.name}</SheetTitle>
          <SheetDescription>
            {donor.address}
          </SheetDescription>
        </SheetHeader>
        
        <div className="px-6">
          <Card>
            <CardContent className="p-3">
              <p className="text-sm font-medium mb-3 text-secondary-foreground">Giving Summary</p>
              <div className="grid grid-cols-3 gap-3">
                <StatCard 
                  icon={<Gift className="w-5 h-5" />}
                  label="Last Gift"
                  value={`$${(donor.givingSummary.lastDonationAmount || 0).toLocaleString()}`}
                />
                 <StatCard 
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Avg. Gift"
                  value={`$${(donor.givingSummary.averageGift || 0).toLocaleString()}`}
                />
                 <StatCard 
                  icon={<DollarSign className="w-5 h-5" />}
                  label="Total Giving"
                  value={`$${(donor.givingSummary.totalDonations || 0).toLocaleString()}`}
                />
              </div>
            </CardContent>
          </Card>
        </div>


        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="px-6 py-4 space-y-6 overflow-y-auto flex-grow">
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Call Outcome *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        {(['completed', 'left-vm', 'no-answer', 'bad-number'] as const).map(outcome => (
                          <FormItem key={outcome} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={outcome} id={`${outcome}-${donor.id}`} />
                            </FormControl>
                            <FormLabel htmlFor={`${outcome}-${donor.id}`} className="font-normal capitalize cursor-pointer">{outcome.replace('-', ' ')}</FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Notes *</FormLabel>
                      <Button type="button" variant="ghost" size="sm" onClick={handleSuggestion} disabled={isSuggesting}>
                        {isSuggesting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Suggest
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea placeholder="e.g., Confirmed new address, seems happy with our work..." {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nextStep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Step (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Send follow-up email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="followUpDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Follow-up Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="p-6 mt-auto pt-4 border-t bg-card">
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Interaction
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
