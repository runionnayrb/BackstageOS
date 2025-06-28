import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  User, 
  MessageSquare,
  Reply,
  Send,
  FileText
} from "lucide-react";

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  position?: number;
  replies?: Comment[];
  resolved?: boolean;
}

interface CommentsPanelProps {
  comments: Comment[];
  onAddComment?: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  onResolveComment?: (commentId: string) => void;
  className?: string;
  showHeader?: boolean;
}

export function CommentsPanel({
  comments,
  onAddComment,
  onResolveComment,
  className = "",
  showHeader = true
}: CommentsPanelProps) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment({
        text: newComment,
        author: "Current User",
        position: 1
      });
      setNewComment("");
    }
  };

  const handleAddReply = (commentId: string) => {
    if (replyText.trim() && onAddComment) {
      onAddComment({
        text: replyText,
        author: "Current User",
        replies: []
      });
      setReplyText("");
      setReplyTo(null);
    }
  };

  const getAuthorInitials = (author: string) => {
    if (!author) return 'U';
    return author.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={`${showHeader ? 'border rounded-lg bg-white dark:bg-gray-900' : ''} ${className}`}>
      {showHeader && (
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comments</h3>
            <Badge variant="outline" className="text-xs">
              {comments.filter(c => !c.resolved).length} active
            </Badge>
          </div>
        </div>
      )}

      <ScrollArea className="h-[500px]">
        <div className={`${showHeader ? 'p-4' : ''} space-y-4`}>
          {/* Add new comment */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-medium mb-2">Add Comment</h4>
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-2"
              rows={3}
            />
            <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
              <Send className="h-3 w-3 mr-1" />
              Post Comment
            </Button>
          </div>

          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Add comments to collaborate on the script</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={`border rounded-lg p-4 ${comment.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getAuthorInitials(comment.author)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(comment.timestamp)}
                      </div>
                      {comment.position && (
                        <Badge variant="outline" className="text-xs">
                          Line {comment.position}
                        </Badge>
                      )}
                      {comment.resolved && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm mb-2">{comment.text}</p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        className="h-6 px-2 text-xs"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      
                      {!comment.resolved && onResolveComment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onResolveComment(comment.id)}
                          className="h-6 px-2 text-xs text-green-600"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                    
                    {/* Reply input */}
                    {replyTo === comment.id && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="mb-2"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleAddReply(comment.id)} disabled={!replyText.trim()}>
                            Reply
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Show replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="border-l-2 border-gray-200 pl-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs">{reply.author}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatTime(reply.timestamp)}
                              </div>
                            </div>
                            <p className="text-xs">{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}