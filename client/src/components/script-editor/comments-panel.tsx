import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Clock, 
  User, 
  MessageSquare,
  Reply,
  Send,
  FileText,
  ChevronDown,
  ChevronRight
} from "lucide-react";

interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  position?: number;
  replies?: Comment[];
  resolved?: boolean;
  parentId?: string;
}

interface CommentsPanelProps {
  comments: Comment[];
  onAddComment?: (comment: Partial<Comment> & { parentId?: string }) => void;
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
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());

  const formatTime = (date: string) => {
    if (!date) return 'Now';
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? 'Now' : parsedDate.toLocaleString();
  };

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment({
        text: newComment,
        position: 1
      });
      setNewComment("");
    }
  };

  const handleAddReply = (commentId: string) => {
    if (replyText.trim() && onAddComment) {
      onAddComment({
        text: replyText,
        parentId: commentId,
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

  const toggleThread = (commentId: string) => {
    setCollapsedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
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
            comments.map((comment) => {
              const isCollapsed = collapsedThreads.has(comment.id);
              const hasReplies = comment.replies && comment.replies.length > 0;
              
              return (
                <Collapsible key={comment.id} open={!isCollapsed} onOpenChange={() => toggleThread(comment.id)}>
                  <div className={`border rounded-lg p-4 ${comment.resolved ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {getAuthorInitials(comment.author)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {hasReplies && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                                {isCollapsed ? (
                                  <ChevronRight className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
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
                          {hasReplies && (
                            <Badge variant="outline" className="text-xs">
                              {comment.replies?.length || 0} {(comment.replies?.length || 0) === 1 ? 'reply' : 'replies'}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm mb-2">{comment.text}</p>
                        
                        <CollapsibleContent>
                          <div className="space-y-3">
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
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-blue-200">
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
                            
                            {/* Nested replies */}
                            {hasReplies && (
                              <div className="ml-6 space-y-3 border-l-2 border-gray-100 pl-4">
                                {(comment.replies || []).map((reply, replyIndex) => (
                                  <div key={reply.id || `reply-${comment.id}-${replyIndex}`} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                      <Avatar className="h-6 w-6 flex-shrink-0">
                                        <AvatarFallback className="text-xs">
                                          {getAuthorInitials(reply.author)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-xs">{reply.author}</span>
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(reply.timestamp)}
                                          </div>
                                        </div>
                                        <p className="text-sm">{reply.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </div>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}