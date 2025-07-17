import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, Clock, Users, FileText, AlertCircle } from "lucide-react";
import { insertShowContractSettingsSchema } from "@shared/schema";

// Contract defaults lookup for auto-fill functionality
const CONTRACT_DEFAULTS = {
  "Production": {
    baseSalary: 2439,
    understudyBump: 60,
    swingBumpRule: "1/8 of baseSalary if performing 5+ tracks in a single performance",
    partialSwingIncrement: 20,
    rehearsalCap: 10,
    overtimeTrigger: "Above 10 hours/week"
  },
  "LORT A": {
    baseSalary: 1191,
    understudyBump: 35,
    swingBump: 25,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  },
  "LORT B": {
    baseSalary: 1145,
    understudyBump: 35,
    swingBump: 25,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  },
  "LORT C": {
    baseSalary: 1016,
    understudyBump: 30,
    swingBump: 20,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  },
  "LORT D": {
    baseSalary: 879,
    understudyBump: 25,
    swingBump: 15,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  },
  "SPT Tier 1": {
    baseSalary: 286,
    understudyBump: 25,
    swingBump: 15,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  },
  "SPT Tier 3": {
    baseSalary: 427,
    understudyBump: 30,
    swingBump: 20,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  },
  "SPT Tier 10": {
    baseSalary: 727,
    understudyBump: 40,
    swingBump: 30,
    rehearsalCap: 8,
    overtimeTrigger: "Above 8 hours/week"
  }
};

const settingsFormSchema = insertShowContractSettingsSchema.extend({
  contractType: z.enum(["Production", "LORT A", "LORT B", "LORT C", "LORT D", "SPT Tier 1", "SPT Tier 3", "SPT Tier 10"]),
  baseSalary: z.coerce.number().min(0),
  understudyBump: z.coerce.number().min(0),
  swingBump: z.coerce.number().min(0).optional(),
  swingBumpRule: z.string().optional(),
  partialSwingIncrement: z.coerce.number().min(0).optional(),
  rehearsalCap: z.coerce.number().min(0),
  overtimeTrigger: z.string()
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface ShowContractSettingsFormProps {
  projectId: number;
  settings?: any;
  onClose: () => void;
  hasEquityMembers?: boolean;
}

export function ShowContractSettingsForm({ projectId, settings, onClose, hasEquityMembers = false }: ShowContractSettingsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      projectId,
      contractType: settings?.contractType || "Production",
      baseSalary: settings?.baseSalary || 0,
      understudyBump: settings?.understudyBump || 0,
      swingBump: settings?.swingBump || 0,
      swingBumpRule: settings?.swingBumpRule || "",
      partialSwingIncrement: settings?.partialSwingIncrement || 0,
      rehearsalCap: settings?.rehearsalCap || 8,
      overtimeTrigger: settings?.overtimeTrigger || "Above 8 hours/week",
      createdBy: settings?.createdBy || 1
    }
  });

  // Auto-fill handler for contract type selection
  const handleContractTypeChange = (contractType: string) => {
    if (!hasEquityMembers) {
      toast({
        title: "Equity Status Required",
        description: "Contract defaults only apply when at least one cast member has Equity status.",
        variant: "destructive"
      });
      return;
    }

    const defaults = CONTRACT_DEFAULTS[contractType as keyof typeof CONTRACT_DEFAULTS];
    if (defaults) {
      form.setValue("baseSalary", defaults.baseSalary);
      form.setValue("understudyBump", defaults.understudyBump);
      form.setValue("rehearsalCap", defaults.rehearsalCap);
      form.setValue("overtimeTrigger", defaults.overtimeTrigger);
      
      if (defaults.swingBump) {
        form.setValue("swingBump", defaults.swingBump);
      }
      if (defaults.swingBumpRule) {
        form.setValue("swingBumpRule", defaults.swingBumpRule);
      }
      if (defaults.partialSwingIncrement) {
        form.setValue("partialSwingIncrement", defaults.partialSwingIncrement);
      }
      
      toast({
        title: "Contract defaults applied",
        description: `${contractType} contract settings have been auto-filled. All fields remain editable.`
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      if (settings?.id) {
        return apiRequest(`/api/projects/${projectId}/show-contract-settings/${settings.id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest(`/api/projects/${projectId}/show-contract-settings`, {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'show-contract-settings'] });
      toast({
        title: "Success",
        description: "Contract settings saved successfully"
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: SettingsFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Equity Contract Settings
          </DialogTitle>
        </DialogHeader>

        {!hasEquityMembers && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">No Equity Members Detected</p>
            </div>
            <p className="text-sm text-amber-600 mt-1">
              Contract defaults will only apply when at least one cast member has Equity status.
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contract Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Type & Auto-Fill
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Contract Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleContractTypeChange(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose contract type to auto-fill defaults" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Production">Production</SelectItem>
                          <SelectItem value="LORT A">LORT A</SelectItem>
                          <SelectItem value="LORT B">LORT B</SelectItem>
                          <SelectItem value="LORT C">LORT C</SelectItem>
                          <SelectItem value="LORT D">LORT D</SelectItem>
                          <SelectItem value="SPT Tier 1">SPT Tier 1</SelectItem>
                          <SelectItem value="SPT Tier 3">SPT Tier 3</SelectItem>
                          <SelectItem value="SPT Tier 10">SPT Tier 10</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Salary Structure */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="baseSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Salary ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Enter base salary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="understudyBump"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Understudy Bump ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Enter understudy bump"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="swingBump"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Swing Bump ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Enter swing bump"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partialSwingIncrement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partial Swing Increment ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="Enter partial swing increment"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Swing Bump Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Swing Bump Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="swingBumpRule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Swing Bump Rule</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter detailed swing bump rule (e.g., 1/8 of baseSalary if performing 5+ tracks)"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Time & Overtime */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time & Overtime Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rehearsalCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rehearsal Cap (hours/week)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="Enter rehearsal cap"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="overtimeTrigger"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Trigger</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Above 8 hours/week"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Contract Settings"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
