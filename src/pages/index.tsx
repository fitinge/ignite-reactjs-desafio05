import { GetStaticProps } from 'next';

import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import Link from 'next/link';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import Header from '../components/Header';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}
export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  const router = useRouter();

  async function handleMorePosts(url: string): Promise<void> {
    const postsResponseFetch = await fetch(url);
    const postsResponse = await postsResponseFetch.json();

    setNextPage(postsResponse.next_page);

    const postsFormat = postsResponse.results.map(post => {
      return {
        ...post,
        first_publication_date: format(
          new Date(post.first_publication_date),
          'dd MMM yyyy',
          {
            locale: ptBR,
          }
        ),
      };
    });

    setPosts([...posts, ...postsFormat]);
  }

  return (
    <main className={commonStyles.container}>
      <Head>
        <title>spacetraveling</title>
      </Head>
      <Header />

      <ul className={styles.listPosts}>
        {posts.map(post => (
          <li key={post.uid}>
            <Link href={`/post/${post.uid}`}>
              <a>
                <h2 className={styles.title}>{post.data.title}</h2>
              </a>
            </Link>
            <p className={styles.desc}>{post.data.subtitle}</p>
            <div className={commonStyles.info}>
              <time>
                <FiCalendar size={20} />
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </time>
              <span>
                <FiUser size={20} />
                {post.data.author}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {nextPage && (
        <button
          type="button"
          onClick={() => handleMorePosts(nextPage)}
          className={styles.morePosts}
        >
          Carregar mais posts
        </button>
      )}
      {preview && (
        <button
          type="button"
          onClick={() => {
            router.push('/api/exit-preview');
          }}
          className={commonStyles.preview}
        >
          Sair do modo Preview
        </button>
      )}
    </main>
  );
}

export const getStaticProps: GetStaticProps = async context => {
  const { preview = false } = context;
  const { previewData = {} } = context;
  const { ref } = previewData;

  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
      ref,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      ...post,
    };
  });

  return {
    props: {
      postsPagination: { ...postsResponse, results: posts },
      preview,
    },
  };
};
