import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  FileText, 
  Clock,
  User,
  Calendar,
  Edit3
} from "lucide-react";

interface PropDetailParams {
  id: string;
  propId: string;
}

interface Prop {
  id: number;
  name: string;
  description: string;
  act: string;
  scene: string;
  character: string;
  location: string;
  status: 'needed' | 'pulled' | 'rehearsal' | 'performance' | 'returned';
  notes: string;
  quantity: number;
  sourcingNotes: string;
  imageUrl?: string;
  consumableType: 'not_consumable' | 'consumable';
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: 'needed', label: 'Needed', color: 'bg-red-100 text-red-800' },
  { value: 'pulled', label: 'Pulled', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rehearsal', label: 'In Rehearsal', color: 'bg-blue-100 text-blue-800' },
  { value: 'performance', label: 'In Performance', color: 'bg-green-100 text-green-800' },
  { value: 'returned', label: 'Returned', color: 'bg-gray-100 text-gray-800' },
];

export default function PropDetail() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<PropDetailParams>();
  const projectId = params.id;
  const propId = params.propId;

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: props = [], isLoading: propsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "props"],
    enabled: !!projectId && isAuthenticated,
  });

  const project = Array.isArray(projects) ? projects.find((p: any) => p.id === parseInt(projectId || '0')) : null;
  const prop = Array.isArray(props) ? props.find((p: Prop) => p.id === parseInt(propId || '0')) : null;

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  if (isLoading || projectsLoading || propsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!project || !prop) {
    return <div className="min-h-screen flex items-center justify-center">Prop not found</div>;
  }

  const statusInfo = getStatusInfo(prop.status);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/props`)}
            className="text-gray-600 hover:text-gray-900 p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-semibold text-gray-900 truncate mx-3">
            {prop.name}
          </h1>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${projectId}/props`)} // In a real app, this would open an edit modal
            className="text-blue-600 hover:text-blue-700 p-1"
          >
            <Edit3 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Main Info Card */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            {/* Status Badge */}
            <div className="flex justify-center pb-2">
              <Badge variant="secondary" className={`${statusInfo.color} text-base px-4 py-2`}>
                {statusInfo.label}
              </Badge>
            </div>
            {prop.description && (
              <div>
                <p className="text-gray-700">{prop.description}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-sm text-gray-500">Act & Scene</span>
                <p className="font-medium">
                  {prop.act && prop.scene ? `Act ${prop.act}, Scene ${prop.scene}` : 
                   prop.act ? `Act ${prop.act}` : 
                   prop.scene ? `Scene ${prop.scene}` : '—'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Character</span>
                <p className="font-medium">{prop.character || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Location</span>
                <p className="font-medium">{prop.location || "—"}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Quantity</span>
                <p className="font-medium">{prop.quantity}</p>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-gray-500">Type</span>
                <p className="font-medium">
                  {prop.consumableType === 'consumable' ? 'Consumable' : 'Not Consumable'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sourcing Notes */}
        {prop.sourcingNotes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sourcing Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{prop.sourcingNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Notes */}
        {prop.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{prop.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Created: {new Date(prop.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Updated: {new Date(prop.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}