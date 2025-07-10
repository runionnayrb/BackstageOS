import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";

export default function TestImageUpload() {
  const [content, setContent] = useState("");

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Rich Text Editor with Image Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Use the toolbar to format text and click the image icon to upload and insert images directly into the editor.
            </p>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start typing or click the image icon to upload an image..."
              className="min-h-[400px]"
            />
            <div className="mt-4">
              <h3 className="font-semibold mb-2">HTML Output Preview:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {content || "No content yet..."}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}