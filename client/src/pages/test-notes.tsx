import ReportNotesManager from '@/components/report-notes-manager';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function TestNotesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shows
          </Link>
          <h1 className="text-3xl font-bold mb-2">Report Notes Test Page</h1>
          <p className="text-muted-foreground">Testing the ReportNotesManager component with Hamlet rehearsal report.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Rehearsal Report - Act I</h2>
          <p className="text-muted-foreground mb-6">Today we focused on Act I blocking and character work.</p>
          
          <ReportNotesManager 
            reportId={5} 
            projectId={1} 
            reportType="rehearsal" 
          />
        </div>
      </div>
    </div>
  );
}