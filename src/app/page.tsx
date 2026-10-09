import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  PenLine,
  Sparkles,
} from "@/components/icons";
import { FormatGrid } from "@/components/studio/format-grid";
export default function LandingPage() {
  return (
    <div className="studio-shell studio-home">
      <div className="studio-home-inner">
        <section className="studio-hero">
          <div>
            <span className="studio-eyebrow">
              <span className="studio-dot" /> A LITTLE IDEA. A WHOLE NEW
              CHAPTER.
            </span>
            <h1>
              Your story.
              <br />
              Your expertise.
              <br />
              <em>Your next book.</em>
            </h1>
            <p>
              A thoughtful space to turn what’s in your head into something
              readers can hold, learn from, or listen to.
            </p>
            <Link href="/books/new" className="studio-button primary">
              Start creating <ArrowRight />
            </Link>
            <div className="studio-hero-points">
              <span>
                <Check /> Write at your own pace
              </span>
              <span>
                <Check /> Make it yours with AI
              </span>
            </div>
          </div>
          <div className="studio-hero-art" aria-hidden="true">
            <div className="studio-book-object">
              <span>
                THE BOOK
                <br />
                YOU HAVEN’T
                <br />
                WRITTEN.<em>Yet.</em>
              </span>
              <div className="studio-book-line" />
              <small>YOUR NAME BELONGS HERE</small>
            </div>
            <div className="studio-art-note">
              <PenLine />
              <div>
                <strong>One idea can change everything.</strong>
                <span>Let’s give yours a place to start.</span>
              </div>
            </div>
            <div className="studio-art-tag">
              <Sparkles /> Made by you. Helped by AI.
            </div>
          </div>
        </section>
        <section id="formats" className="studio-format-section">
          <div className="studio-section-heading">
            <div>
              <span className="studio-eyebrow">
                FIVE WAYS TO BRING IT TO LIFE
              </span>
              <h2>Find the shape of your idea.</h2>
            </div>
            <p>
              Same creative spark.
              <br />A format for every kind of reader.
            </p>
          </div>
          <FormatGrid />
          <p className="studio-footnote">
            Page counts are planning targets, not generated page guarantees. AI
            features require a configured provider.
          </p>
        </section>
        <section className="studio-process">
          <div>
            <span>01</span>
            <BookOpen />
            <h3>Give it a direction</h3>
            <p>
              Pick a format, define your reader, and shape an outline that fits.
            </p>
          </div>
          <div>
            <span>02</span>
            <PenLine />
            <h3>Find your writing rhythm</h3>
            <p>
              Write on a clean page. Keep notes close. Save every chapter as you
              go.
            </p>
          </div>
          <div>
            <span>03</span>
            <ArrowRight />
            <h3>Let it leave the studio</h3>
            <p>
              Preview, design your cover, and export a PDF, EPUB, or narration
              script.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
