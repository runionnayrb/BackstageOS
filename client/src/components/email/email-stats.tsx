import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { Clock, CheckCircle, XCircle, RefreshCw, Mail, Send, AlertTriangle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface EmailStatsProps {
  accountId: number;
}

export function EmailStats({ accountId }: EmailStatsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get delivery statistics
  const { data: deliveryStats, isLoading: loadingDelivery } = useQuery({
    queryKey: ['/api/email/accounts', accountId, 'delivery-stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get queue statistics
  const { data: queueStats, isLoading: loadingQueue } = useQuery({
    queryKey: ['/api/email/queue-stats'],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Retry failed emails mutation
  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/email/retry-failed');
    },
    onSuccess: async (response) => {
      const data = await response.json();
      toast({
        title: "Retry completed",
        description: `${data.retriedCount} failed emails have been retried.`,
      });
      
      // Refresh stats
      queryClient.invalidateQueries({ queryKey: ['/api/email/accounts', accountId, 'delivery-stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/queue-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Retry failed",
        description: error.message || "Failed to retry failed emails.",
        variant: "destructive",
      });
    }
  });

  if (loadingDelivery || loadingQueue) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasFailedEmails = deliveryStats?.failedCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Delivery Statistics */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Send className="h-4 w-4" />
            Delivery Status
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Delivered:</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {deliveryStats?.deliveredCount || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Failed:</span>
              <Badge variant="outline" className="text-red-600 border-red-200">
                <XCircle className="h-3 w-3 mr-1" />
                {deliveryStats?.failedCount || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Clock className="h-3 w-3 mr-1" />
                {deliveryStats?.pendingCount || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sent:</span>
              <Badge variant="outline">
                {deliveryStats?.totalSent || 0}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Queue Statistics */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Queue Status
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Waiting:</span>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {queueStats?.waiting || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Processing:</span>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {queueStats?.active || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {queueStats?.completed || 0}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Failed:</span>
              <Badge variant="outline" className="text-red-600 border-red-200">
                {queueStats?.failed || 0}
              </Badge>
            </div>
          </div>
        </div>

        {/* Retry Failed Emails Button */}
        {hasFailedEmails && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Failed emails detected
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryFailedMutation.mutate()}
                disabled={retryFailedMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {retryFailedMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry Failed
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Success Rate */}
        {deliveryStats?.totalSent > 0 && (
          <>
            <Separator />
            <div className="text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate:</span>
                <Badge 
                  variant="outline" 
                  className={`${
                    deliveryStats.successRate >= 95 
                      ? 'text-green-600 border-green-200' 
                      : deliveryStats.successRate >= 85 
                      ? 'text-yellow-600 border-yellow-200' 
                      : 'text-red-600 border-red-200'
                  }`}
                >
                  {deliveryStats.successRate?.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}