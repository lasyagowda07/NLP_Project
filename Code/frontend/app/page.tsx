// app/page.tsx
export default function Home() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-3xl font-bold">
        CFPB Complaint Routing – NLP Pipeline
      </h1>
      <p className="max-w-xl text-sm text-slate-300">
        Use the navigation above to explore each phase of the project:
        scraping the CFPB complaints data, running EDA, testing the
        baseline TF-IDF + Naive Bayes model, and comparing it with a
        fine-tuned DistilBERT transformer.
      </p>
    </div>
  );
}