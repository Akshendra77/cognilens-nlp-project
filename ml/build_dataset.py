"""Create a reproducible, synthetic teaching corpus. No real personal data.

All context variants of a template stay in the same split. Test templates and
contexts are disjoint from training, but share an author and linguistic style.
These are instructional examples, not expert clinical annotations.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = {
    'all_or_nothing': [
        'If {e} is not perfect, it is a complete failure.',
        'Either I am the best at {e} or I am worthless.',
        'There is no middle ground: {e} must be flawless or it is useless.',
        'Anything less than a perfect score on {e} is failure.',
        'One mistake makes all of {e} a total disaster.',
        'I have to get everything right in {e} or nothing counts.',
        'Unless every part of {e} succeeds, none of it matters.',
        'I am either completely successful at {e} or a total failure.',
        'If I cannot do {e} perfectly, there is no point trying.',
        'Only total success in {e} is acceptable; the rest is failure.',
        'There are only two outcomes for {e}: perfection or failure.',
        '{e} has to be absolutely perfect to have any value.',
        'A single flaw in {e} means the whole thing is worthless.',
        'I see {e} in black and white; it is either excellent or terrible.',
        'Getting most of {e} right is just as bad as getting nothing right.',
        'If {e} is not a hundred percent successful, it is zero percent successful.'
    ],
    'overgeneralization': [
        'I failed at {e} once, so I will always fail at everything.',
        'Because {e} went badly, nothing ever works out for me.',
        'One rejection in {e} proves nobody will ever accept me.',
        'I made a mistake during {e}; I always mess everything up.',
        'This problem with {e} means my whole life will go wrong.',
        'I lost once at {e}, so I never succeed at anything.',
        'Since {e} was difficult today, every future attempt will be difficult.',
        'One bad experience with {e} proves all experiences are bad.',
        'A person criticized {e}, so everyone always criticizes my work.',
        'After one setback in {e}, I know I will never get anything right.',
        '{e} did not go well; this happens to me every single time.',
        'I struggled with {e}, therefore I am bad at everything I try.',
        'One disappointing result in {e} means I will never succeed again.',
        'A mistake in {e} shows that every attempt I make is doomed.',
        'Since one person disliked {e}, nobody will ever like my work.',
        'This single setback in {e} proves that things always go badly for me.'
    ],
    'mental_filter': [
        'Many parts of {e} went well, but I can only focus on one mistake.',
        'I got plenty of good feedback on {e}, yet the one criticism is all I see.',
        'Despite several successes in {e}, I keep dwelling on the negative detail.',
        'The only thing I remember about {e} is the tiny error.',
        'I ignore everything that went well in {e} and focus on what went wrong.',
        'There were nine compliments about {e}, but I fixate on the one complaint.',
        'The small flaw in {e} is all I can think about despite the positives.',
        'I keep replaying the bad moment from {e} and overlook the good moments.',
        'Even though {e} went mostly well, my attention stays on that mistake.',
        'I cannot notice any of the good in {e} because of one negative comment.',
        'I only pay attention to the criticism of {e} and ignore the praise.',
        'The positive parts of {e} disappear from view while I dwell on the flaw.',
        'All the praise for {e} fades away; the single negative remark fills my mind.',
        'I selectively remember the error in {e} despite everything else going well.',
        'I keep zooming in on the one bad detail of {e} and miss the bigger picture.',
        'The good outcomes of {e} are invisible to me because I am stuck on a fault.'
    ],
    'discounting_positive': [
        'I did well at {e}, but it does not count because it was just luck.',
        'The praise for {e} means nothing; they were only being polite.',
        'My success in {e} was a fluke, not a real achievement.',
        'Anyone could have done {e}, so my achievement has no value.',
        'They complimented {e} out of pity, so the compliment does not count.',
        'I succeeded at {e} only because it was easy, not because I have ability.',
        'The good result in {e} was an accident; I deserve no credit.',
        'I dismiss the positive feedback on {e} because they did not mean it.',
        'Even though I worked hard on {e}, the success was just a lucky break.',
        'That achievement in {e} is nothing special and does not count.',
        'People say {e} was good, but they are just trying to be nice.',
        'I refuse to count {e} as a success because anybody could do it.',
        'The excellent outcome of {e} was pure chance and says nothing about my skills.',
        'Their kind words about {e} cannot be sincere; they only feel sorry for me.',
        'I earned praise for {e}, but I brush it off as meaningless politeness.',
        'The award for {e} means nothing because the task was too easy.'
    ],
    'mind_reading': [
        'Without asking, I know they think {e} was stupid.',
        'Everyone secretly thinks I am incompetent because of {e}.',
        'They did not reply about {e}, so they must hate me.',
        'I can tell they are judging me over {e}, even though they said nothing.',
        'Their silence about {e} proves they are disappointed in me.',
        'I know my classmates are laughing at me because of {e}.',
        'They must think I am boring after {e}, although I have no evidence.',
        'That look means they believe I am useless at {e}.',
        'I am certain everyone dislikes me after {e}, even without asking them.',
        'They looked away during {e}, which means they think I am an idiot.',
        'Nobody said anything about {e}; I know they secretly disapprove.',
        'I know what they are thinking: they all believe {e} was pathetic.',
        'They have not told me, but I am sure they consider {e} embarrassing.',
        'The unread message about {e} must mean they are angry with me.',
        'Their facial expression tells me they think I am a failure at {e}.',
        'I assume they despise me because they were quiet after {e}.'
    ],
    'catastrophizing': [
        'If {e} goes wrong, my entire future will be ruined.',
        'A mistake in {e} will destroy my career and I will lose everything.',
        'The worst possible outcome of {e} is definitely going to happen.',
        'This small problem in {e} will turn into an unbearable disaster.',
        'If I struggle with {e}, my life will be over.',
        '{e} will go horribly wrong and I will never recover.',
        'One bad result in {e} will lead to losing everything I care about.',
        'The setback in {e} means a catastrophe is coming.',
        'If {e} fails, I will lose my job and end up completely alone.',
        'This issue with {e} will have disastrous consequences that I cannot survive.',
        'I am sure {e} will be a disaster that ruins the rest of my life.',
        'A tiny error in {e} will become the end of the world for me.',
        'A poor outcome in {e} will wreck every chance I have in life.',
        'If something goes wrong with {e}, everything will collapse beyond repair.',
        'The slightest problem in {e} will cause a devastating chain of disasters.',
        'I expect {e} to end terribly and leave my future permanently destroyed.'
    ],
    'emotional_reasoning': [
        'I feel like a failure at {e}, so I must actually be a failure.',
        'I feel anxious about {e}, therefore it must be dangerous.',
        'Because I feel guilty about {e}, I must have done something wrong.',
        'My feeling of embarrassment proves {e} was embarrassing.',
        'I feel incapable of {e}, so I have no ability.',
        'Feeling scared of {e} means something terrible is certain to happen.',
        'I feel unwanted after {e}, so nobody wants me around.',
        'Because I feel stupid during {e}, I really am stupid.',
        'My nervousness about {e} is proof that I cannot handle it.',
        'I feel hopeless about {e}, which means there is no hope.',
        'My shame about {e} proves that I am a bad person.',
        'I feel worthless after {e}; that feeling must be the truth.',
        'The dread I feel about {e} is evidence that it is unsafe.',
        'Since {e} makes me feel inadequate, I conclude that I am inadequate.',
        'I take my sadness after {e} as proof that everything really is hopeless.',
        'I feel rejected after {e}, therefore I know I have been rejected.'
    ],
    'should_statements': [
        'I should never make any mistakes in {e}.',
        'I must always be perfect at {e}; anything else is unacceptable.',
        'I ought to be able to handle {e} without any help.',
        'People should always agree with me about {e}.',
        'I should have mastered {e} already and I am wrong for struggling.',
        'I must not feel nervous about {e}; I have to be confident all the time.',
        'I should be the best at {e}, and I am unacceptable if I am not.',
        'Everyone ought to appreciate {e} exactly the way I expect.',
        'I must always know the answer during {e}.',
        'I should never need a break from {e}.',
        'Other people must meet my standards for {e} without exception.',
        'I ought to do {e} flawlessly every single time.',
        'I should never find {e} difficult; struggling is unacceptable.',
        'I must excel at {e} at all times or I have broken my own rules.',
        'There is no excuse: I ought to complete {e} without a single error.',
        'People should behave exactly as I demand during {e}.'
    ],
    'labeling': [
        'I made a mistake in {e}; I am a loser.',
        'Because I struggled with {e}, I am an idiot.',
        'I did badly at {e}, which makes me a worthless person.',
        'After {e}, I am nothing but a failure as a person.',
        'That person made an error in {e}, so they are a complete moron.',
        'I forgot something in {e}; I am stupid.',
        'I am a total loser because of {e}.',
        'My mistake at {e} defines me: I am incompetent.',
        'I am a bad person because I did not do well at {e}.',
        'I struggled with {e}; the word useless describes who I am.',
        'One error in {e} shows I am an absolute idiot.',
        'I am a hopeless failure, not just someone who struggled with {e}.',
        'The setback in {e} defines my entire identity as a loser.',
        'After doing poorly at {e}, I call myself a worthless idiot.',
        'An error in {e} means I am fundamentally a useless person.',
        'I attach the label failure to myself because of {e}.'
    ],
    'personalization': [
        '{e} went wrong and it is entirely my fault, even though many people were involved.',
        'They seemed upset after {e}; I must have caused their bad mood.',
        'I blame myself for everything that happened in {e}, including things I could not control.',
        'The team had trouble with {e}, so I alone am responsible.',
        'It is my fault that other people were unhappy with {e}, even without evidence.',
        'If someone is quiet after {e}, I assume I did something wrong.',
        'I caused the problems with {e}, even the ones outside my control.',
        'I take all the blame for {e} despite having no role in the decision.',
        'Their disappointment about {e} is my responsibility alone.',
        'The event was cancelled during {e}; somehow it must be because of me.',
        'I am responsible for everyone feeling bad about {e}.',
        'All the problems in {e} are my fault, regardless of what anyone else did.',
        'I hold myself solely accountable for the external problems affecting {e}.',
        'Someone was unhappy at {e}, so I assume I personally caused it.',
        'Even factors beyond my influence in {e} feel like my fault.',
        'I take personal blame for the group outcome of {e} without evidence.'
    ],
    'no_clear_pattern': [
        'I made a mistake in {e}, and I can learn from it.',
        '{e} was difficult, but some parts went well.',
        'I feel anxious about {e}, but that does not mean something bad will happen.',
        'I do not know what others think about {e}; I could ask them.',
        'One setback in {e} does not determine my future.',
        'I am disappointed about {e}, and I will decide what to do next.',
        'I can improve {e} with practice and support.',
        'The feedback on {e} included both strengths and areas to improve.',
        'I worked hard on {e} and I am pleased with the result.',
        'I would prefer {e} to go well, but it does not have to be perfect.',
        'I should check the schedule for {e} tomorrow.',
        '{e} starts at ten and ends at noon.',
        'I sometimes struggle with {e}, but that does not make me a failure.',
        'Their silence after {e} could have several explanations.',
        'I can acknowledge the good and bad parts of {e} together.',
        'I will prepare for {e} this afternoon and take a break later.'
    ]
}

def main():
    train_contexts = ['my presentation', 'the interview', 'the assignment', 'the team meeting']
    test_contexts = ['the workshop', 'the competition', 'the project review', 'the seminar']
    rows = []
    for label, templates in TEMPLATES.items():
        for number, template in enumerate(templates):
            split = 'train' if number < 12 else 'test'
            for context in train_contexts if split == 'train' else test_contexts:
                rows.append({'text': template.format(e=context), 'label': label,
                             'group': f'{label}_{number:02d}', 'split': split,
                             'source': 'synthetic_instructional'})
    ROOT.joinpath('data').mkdir(exist_ok=True)
    with ROOT.joinpath('data/corpus.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f'Wrote {len(rows)} synthetic examples; {sum(r["split"] == "test" for r in rows)} held out.')

if __name__ == '__main__':
    main()
