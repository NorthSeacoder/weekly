import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'sections');
const contentFile = path.join(process.cwd(), 'public/data', 'content.json');
const tagGroupFile = path.join(process.cwd(), 'public/data', 'tagGroup.json');

function generateContent() {
    const files = fs.readdirSync(contentDir);
    const tags = new Set();
    const content = files.map((file) => {
        if (path.extname(file) === '.mdx') {
            const filePath = path.join(contentDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const {data, content} = matter(fileContent);
            data.tags.forEach((tag) => tags.add(tag));
            return {
                metadata: {...data, tags: data.tags.sort(), contentId: path.basename(file, '.mdx').replace('.', '-')},
                content
            };
        }
    });
    const tagsArray = Array.from(tags).sort();
    const tagGroup = tagsArray.map((tag) => {
        const contents = content.filter(({metadata}) => metadata.tags.includes(tag));
        return {
            tag,
            contents
        };
    });
    fs.writeFileSync(contentFile, JSON.stringify(content));
    fs.writeFileSync(tagGroupFile, JSON.stringify(tagGroup));
}

generateContent();
