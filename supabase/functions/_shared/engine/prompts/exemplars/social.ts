/**
 * Whole social posts the drafter studies before it writes one (docs/04 Section 11): each is an original piece from
 * another trade, written in one master's manner, with the move it makes named in one line. The writer studies the
 * moves and never reuses a sentence (six words in a row from an exemplar fail the mechanical check). Every fact in
 * them belongs to its own made-up business; none is a fact about the product being sold.
 */
import type { Exemplar } from "./index.ts";

export const SOCIAL_EXEMPLARS: readonly Exemplar[] = [
  {
    master: "Halbert",
    move: "A story with a date and a dollar figure, the reason the speaker is writing, the product named in one plain sentence, the deal said once at the end.",
    text: `Last March I lost a $140 customer because I was holding a wet poodle when she called.

She rang twice. I had both hands in the tub. By the time I dried off and called back, she had booked down the street.

That kept happening. I counted one week: eleven calls I could not take, and six of those people never called again.

So I started using Clipboard, a booking page for groomers that answers the phone for you. A customer texts or calls, picks a slot from the ones you left open, and pays the deposit before you ever lift the dog into the tub. I fill the slots I want filled. The no-shows stopped the week the deposit started.

In April I had 41 bookings from the page, 9 of them new customers who found me on Google at night, when the shop was dark. My phone did not ring once while I had a dog in my hands.

If you groom and you have ever let a call go to voicemail with your hands full, I wrote this for you.

The first month is $9. Put one week of slots on it and watch who books. Link in the first comment.`,
    first_comment: `$9 for the first month, then $39 a month. clipboardgroom.com`,
  },
  {
    master: "Carlton",
    move: "The proof staged as an event, with the clock on it and the numbers counted off the speaker's own records; the old way told as a day in his life; no moral at the end, just the deal.",
    text: `Thursday at 2:15 a man in a Camry watched me quote his brake job from his own parking lot, and he said yes before the number finished printing.

Four minutes. Parts, labor, the tax, his signature on my phone. He had already called two shops that told him they would call him back.

For eleven years I did it the other way. Take the car's info, drive home, look up parts, type a quote at nine at night, send it, wait. Half of them went cold while I waited.

The quote came out of Wrench Quote, a pricing app for mobile mechanics that looks up the parts for the car in front of you and builds the quote while you stand there. You put in your labor rate once. It does the rest and emails the customer a copy he can sign.

In the first month I used it I wrote 23 quotes and won 16 jobs, counted off my own invoices. The year before, I won about one in three.

Try it on your next three quotes for $1. Link in the first comment.`,
    first_comment: `$1 for the first 14 days, then $29 a month. wrenchquote.app`,
  },
  {
    master: "Hopkins",
    move: "A test the reader runs on himself in the first line, with what he will find; the product as the thing that changes what he just saw; the numbers from the speaker's own listing; the test again at the close.",
    text: `Type your company's name into Google right now and count the stars under it.

If it says 4.2 and 31 reviews, that is what every new customer sees before she calls you. Mine said 3.9 and 18 for two years, and most of the 18 came from people with something to complain about. The happy ones never think to write.

Now the happy ones get asked. The afternoon we finish a house, Tidy Reviews, a text tool for cleaning companies, sends the customer one text with a link that opens the review box on her phone. She taps the stars, writes a line, done. Nobody asks twice.

In five months we went from 18 reviews to 112 and from 3.9 stars to 4.8, counted on our own Google listing. The phone started ringing more in month two. We hired a third crew in month four.

Go count your stars. Then put it on your next twenty jobs for $1. Link in the first comment.`,
    first_comment: `$1 for the first 30 days, then $25 a month. tidyreviews.com`,
  },
  {
    master: "Schwartz",
    move: "The want the reader already has, named in his words in line one; the cost of the old way in small concrete pieces; the product as the new way to get what he already wanted; one case with its numbers; the speaker's stake said plainly.",
    text: `Every plumber I do taxes for wants the same thing in April: to keep more of what he made, without a shoebox of receipts on my desk.

Most of them lose two or three thousand dollars a year to drives they never wrote down. Not the big jobs. The ten-minute runs to the supply house, the callbacks, the quote that did not close. Each one is a deduction, and each one is gone by Friday.

The one who keeps it is the one whose phone keeps the log. MileKeeper is a mileage app for tradesmen that notices when your truck starts moving and writes the trip down for you, with the address at each end. At the end of the week you swipe each trip left for personal or right for work. That is the whole job.

Mike, one of my clients, swiped 1,140 trips last year. His mileage deduction came to $11,900, about $4,000 more than the year before, when he guessed from his calendar.

I do not sell the app. I got tired of watching good money leave the room.

Put it on your phone for a month for $1. Link in the first comment.`,
    first_comment: `$1 for the first month, then $8 a month. milekeeper.app`,
  },
  {
    master: "Sugarman",
    move: "A short first sentence that makes him read the second; each line pulls the next; the day it went wrong told in small pieces; the product in one plain sentence; the numbers with the one case that failed left in, so the rest is believed.",
    text: `My Saturday girl quit by text at 6:40 on a Saturday morning.

I found out when I opened the shop. Two more people called in sick. The line hit the door by nine, and I made coffee for four hours with my coat still on.

That was the morning I stopped running the schedule off a whiteboard. Shiftboard is a scheduling app for cafés that puts the week on everyone's phone, and when someone drops a shift, it texts the open shift to the people who can take it before you even know it is open. The first one to tap it gets it. You find out when it is covered.

Since June we have had 27 dropped shifts, and someone took 25 of them inside an hour, every one of them a person who wanted the hours. The other two were Christmas Eve, and I will give it those.

The price is $19 a month for the whole crew. Try a month for $1. Link in the first comment.`,
    first_comment: `$1 for the first month, then $19 a month. shiftboard.cafe`,
  },
];
