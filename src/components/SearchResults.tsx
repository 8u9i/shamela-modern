import { useState, useEffect } from 'react';
import { Book, SearchResult, ContentSearchResult } from '../types';

interface SearchResultsProps {
  query: string;
  onOpenBook: (book: Book) => void;
  compact?: boolean;
}

export function SearchResults({ query, onOpenBook, compact }: SearchResultsProps) {
  const [bookResults, setBookResults] = useState<SearchResult[]>([]);
  const [contentResults, setContentResults] = useState<ContentSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'books' | 'content'>('books');

  useEffect(() => {
    search();
  }, [query]);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const [books, content] = await Promise.all([
        window.api.search({ query }) as Promise<SearchResult[]>,
        window.api.searchContent({ query, limit: 30 }),
      ]);
      setBookResults(books);
      setContentResults(content);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text: string, term: string) => {
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase()
        ? `<mark class="search-highlight">${part}</mark>`
        : part
    ).join('');
  };

  if (compact) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-card">
          <div className="text-muted-foreground text-xs">
            نتائج عن "{query}"
          </div>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('books')}
            className={`flex-1 px-2 py-1.5 text-[11px] transition-colors ${
              activeTab === 'books'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-secondary-foreground'
            }`}
          >
            الكتب ({bookResults.length.toLocaleString('ar')})
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 px-2 py-1.5 text-[11px] transition-colors ${
              activeTab === 'content'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-secondary-foreground'
            }`}
          >
            في النص ({contentResults.length.toLocaleString('ar')})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse px-3 py-2">
                  <div className="h-3 bg-border rounded w-3/4 mb-1" />
                  <div className="h-2 bg-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeTab === 'books' && bookResults.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onOpenBook(book)}
                  className="w-full text-start px-3 py-2 hover:bg-muted transition-colors"
                >
                  <div className="font-arabic text-foreground text-sm line-clamp-1">
                    {book.title}
                  </div>
                  <div className="text-muted-foreground text-[11px] truncate">
                    {book.author_name}
                  </div>
                  {book.snippet && (
                    <div
                      className="text-muted-foreground text-[10px] mt-0.5 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: book.snippet }}
                    />
                  )}
                </button>
              ))}
              {activeTab === 'content' && contentResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onOpenBook({ id: result.book_id } as Book)}
                  className="w-full text-start px-3 py-2 hover:bg-muted transition-colors"
                >
                  <div className="text-primary text-[11px] font-medium truncate">
                    {result.book_title}
                  </div>
                  <div
                    className="text-muted-foreground text-[10px] line-clamp-2 mt-0.5"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(
                        result.content.length > 200
                          ? result.content.substring(0, 200) + '...'
                          : result.content,
                        query
                      ),
                    }}
                  />
                </button>
              ))}
              {activeTab === 'books' && bookResults.length === 0 && !loading && (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  لا توجد نتائج في الكتب
                </div>
              )}
              {activeTab === 'content' && contentResults.length === 0 && !loading && (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  لا توجد نتائج في محتوى الكتب
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto fade-in">
      <div className="mb-6">
        <h1 className="font-arabic text-2xl text-foreground font-bold">نتائج البحث</h1>
        <p className="text-muted-foreground text-sm mt-1">
          نتائج عن &ldquo;{query}&rdquo;
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'books'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          الكتب ({bookResults.length.toLocaleString('ar')})
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            activeTab === 'content'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          داخل الكتب ({contentResults.length.toLocaleString('ar')})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-border rounded w-1/2 mb-2" />
              <div className="h-3 bg-border rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'books' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bookResults.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onOpenBook(book)}
                  className="book-card bg-card border border-border rounded-xl p-4 text-start hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <h3 className="font-arabic text-foreground text-sm font-medium line-clamp-2 leading-relaxed">
                    {book.title}
                  </h3>
                  <p className="text-muted-foreground text-xs mt-1 truncate">
                    {book.author_name}
                  </p>
                  {book.snippet && (
                    <p
                      className="text-muted-foreground text-xs mt-2 line-clamp-3 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: book.snippet }}
                    />
                  )}
                </button>
              ))}
              {bookResults.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">لا توجد نتائج في الكتب</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-3">
              {contentResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onOpenBook({ id: result.book_id } as Book)}
                  className="w-full bg-card border border-border rounded-xl p-4 text-start hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-arabic text-primary text-sm font-medium">
                      {result.book_title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      صفحة {result.page}
                    </span>
                  </div>
                  <p
                    className="text-muted-foreground text-sm leading-relaxed line-clamp-3"
                    dangerouslySetInnerHTML={{
                      __html: highlightText(
                        result.content.length > 300
                          ? result.content.substring(0, 300) + '...'
                          : result.content,
                        query
                      ),
                    }}
                  />
                </button>
              ))}
              {contentResults.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">لا توجد نتائج في محتوى الكتب</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
