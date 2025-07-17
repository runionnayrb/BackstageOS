import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Settings, Clock, Users, DollarSign, FileText, Shield } from "lucide-react";

const settingsFormSchema = z.object({
  contractType: z.enum(["equity", "non_equity", "mixed"]),
  equityRules: z.object({
    maxRehearsalHours: z.coerce.number().min(0).optional(),
    maxPerformanceHours: z.coerce.number().min(0).optional(),
    minimumBreakTime: z.coerce.number().min(0).optional(),
    overtimeRate: z.coerce.number().min(0).optional(),
    fightCallRequired: z.boolean().default(false),
    voiceCallRequired: z.boolean().default(false),
    intimacyCallRequired: z.boolean().default(false)
  }),
  trackingRequirements: z.object({
    performanceTracking: z.boolean().default(true),
    rehearsalTracking: z.boolean().default(true),
    attendanceTracking: z.boolean().default(true),
    overtimeTracking: z.boolean().default(true),
    breakTracking: z.boolean().default(true),
    revenueTracking: z.boolean().default(false)
  }),
  reportingSettings: z.object({
    weeklyReports: z.boolean().default(true),
    monthlyReports: z.boolean().default(true),
    endOfRunReports: z.boolean().default(true),
    customReportPeriod: z.string().optional()
  }),
  notifications: z.object({
    overtimeAlerts: z.boolean().default(true),
    breakViolationAlerts: z.boolean().default(true),
    attendanceAlerts: z.boolean().default(true),
    reportDeadlineAlerts: z.boolean().default(true)
  }),
  customSettings: z.object({
    additionalNotes: z.string().optional(),
    specialRequirements: z.string().optional(),
    contactInfo: z.string().optional()
  })
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface ShowContractSettingsFormProps {
  projectId: number;
  settings?: any;
  onClose: () => void;
}

export function ShowContractSettingsForm({ projectId, settings, onClose }: ShowContractSettingsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      contractType: settings?.contractType || "equity",
      equityRules: {
        maxRehearsalHours: settings?.equityRules?.maxRehearsalHours || 8,
        maxPerformanceHours: settings?.equityRules?.maxPerformanceHours || 8,
        minimumBreakTime: settings?.equityRules?.minimumBreakTime || 60,
        overtimeRate: settings?.equityRules?.overtimeRate || 1.5,
        fightCallRequired: settings?.equityRules?.fightCallRequired || false,
        voiceCallRequired: settings?.equityRules?.voiceCallRequired || false,
        intimacyCallRequired: settings?.equityRules?.intimacyCallRequired || false
      },
      trackingRequirements: {
        performanceTracking: settings?.trackingRequirements?.performanceTracking ?? true,
        rehearsalTracking: settings?.trackingRequirements?.rehearsalTracking ?? true,
        attendanceTracking: settings?.trackingRequirements?.attendanceTracking ?? true,
        overtimeTracking: settings?.trackingRequirements?.overtimeTracking ?? true,
        breakTracking: settings?.trackingRequirements?.breakTracking ?? true,
        revenueTracking: settings?.trackingRequirements?.revenueTracking ?? false
      },
      reportingSettings: {
        weeklyReports: settings?.reportingSettings?.weeklyReports ?? true,
        monthlyReports: settings?.reportingSettings?.monthlyReports ?? true,
        endOfRunReports: settings?.reportingSettings?.endOfRunReports ?? true,
        customReportPeriod: settings?.reportingSettings?.customReportPeriod || ""
      },
      notifications: {
        overtimeAlerts: settings?.notifications?.overtimeAlerts ?? true,
        breakViolationAlerts: settings?.notifications?.breakViolationAlerts ?? true,
        attendanceAlerts: settings?.notifications?.attendanceAlerts ?? true,
        reportDeadlineAlerts: settings?.notifications?.reportDeadlineAlerts ?? true
      },
      customSettings: {
        additionalNotes: settings?.customSettings?.additionalNotes || "",
        specialRequirements: settings?.customSettings?.specialRequirements || "",
        contactInfo: settings?.customSettings?.contactInfo || ""
      }
    }
  });

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
        description: "Settings saved successfully"
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
            Show Contract Settings
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contract Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contract Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contract type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="non_equity">Non-Equity</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Equity Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Equity Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="equityRules.maxRehearsalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Rehearsal Hours per Day</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="equityRules.maxPerformanceHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Performance Hours per Day</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="equityRules.minimumBreakTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Break Time (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="equityRules.overtimeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime Rate Multiplier</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Special Call Requirements</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="equityRules.fightCallRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Fight Call Required</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="equityRules.voiceCallRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Voice Call Required</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="equityRules.intimacyCallRequired"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Intimacy Call Required</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tracking Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trackingRequirements.performanceTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Performance Tracking</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trackingRequirements.rehearsalTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Rehearsal Tracking</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trackingRequirements.attendanceTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Attendance Tracking</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trackingRequirements.overtimeTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Overtime Tracking</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trackingRequirements.breakTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Break Tracking</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trackingRequirements.revenueTracking"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Revenue Tracking</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customSettings.additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional contract requirements or notes..."
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customSettings.specialRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requirements</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Special equity requirements for this production..."
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customSettings.contactInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equity Contact Information</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Equity representative contact information..."
                          rows={2}
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
                {mutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}