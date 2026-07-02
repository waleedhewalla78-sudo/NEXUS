import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import { trackPageClick } from '@/actions/pages';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function NexusPage({ params }: PageProps) {
  // 1. Fetch the page configuration
  const { data: page, error } = await supabaseAdmin
    .from('nexus_pages')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single();

  if (error || !page) {
    notFound();
  }

  const theme = page.theme || {};
  const bgColor = theme.backgroundColor || '#0f172a'; // Default slate-900
  const textColor = theme.textColor || '#ffffff';

  // Extract tracking to a simple client script later or handle via standard a href
  // For the sake of simplicity, we render links that hit a middleware or just use a proxy.
  // In a real app, we'd use a client component for tracking, but here we'll just render it cleanly.

  return (
    <main 
      className="min-h-screen flex flex-col items-center py-16 px-4"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="w-full max-w-md space-y-8">
        
        {/* Render Blocks */}
        {page.blocks.map((block: any) => {
          switch (block.type) {
            case 'header':
              return (
                <div key={block.id} className="text-center mb-8">
                  {block.content.avatarUrl && (
                    <img 
                      src={block.content.avatarUrl} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white/10"
                    />
                  )}
                  <h1 className="text-2xl font-bold">{block.content.title}</h1>
                  {block.content.subtitle && (
                    <p className="opacity-80 mt-2">{block.content.subtitle}</p>
                  )}
                </div>
              );
              
            case 'text':
              return (
                <div key={block.id} className="text-center opacity-90 px-4">
                  {block.content.text}
                </div>
              );

            case 'link':
              return (
                <a
                  key={block.id}
                  href={block.content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full p-4 rounded-xl text-center font-medium transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {block.content.label}
                </a>
              );

            case 'image':
              return (
                <div key={block.id} className="rounded-xl overflow-hidden border border-white/10">
                  <img 
                    src={block.content.url} 
                    alt={block.content.alt || 'Image'} 
                    className="w-full h-auto object-cover"
                  />
                </div>
              );

            default:
              return null;
          }
        })}

        {/* Branding Footer */}
        <div className="pt-12 pb-4 text-center">
          <p className="text-xs opacity-50 uppercase tracking-widest font-semibold">
            Powered by Nexus Social
          </p>
        </div>
      </div>
    </main>
  );
}
